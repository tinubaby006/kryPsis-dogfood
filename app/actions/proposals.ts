"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createProposal(data: {
    name: string;
    proposedSlug: string;
    description: string;
    timeZone: string;
    submissionsCloseAt: string;
    maxTeamSize: number;
}) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        const slugConflict = await prisma.event.findUnique({ where: { slug: data.proposedSlug } });
        if (slugConflict) return { error: "An event with this slug already exists" };

        const proposalConflict = await prisma.eventProposal.findFirst({
            where: { proposedSlug: data.proposedSlug, status: { notIn: ["REJECTED", "WITHDRAWN"] } }
        });
        if (proposalConflict) return { error: "A pending proposal with this slug already exists" };

        const result = await prisma.$transaction(async (tx) => {
            const proposal = await tx.eventProposal.create({
                data: {
                    applicantUserId: session.user.id,
                    name: data.name,
                    proposedSlug: data.proposedSlug,
                    description: data.description,
                    timeZone: data.timeZone,
                    submissionsCloseAt: new Date(data.submissionsCloseAt),
                    maxTeamSize: data.maxTeamSize,
                    status: "SUBMITTED",
                    submittedAt: new Date()
                }
            });

            await tx.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "PROPOSAL_CREATED",
                    entityType: "EventProposal",
                    entityId: proposal.id,
                    metadata: { slug: data.proposedSlug }
                }
            });
            return proposal;
        });

        revalidatePath("/dashboard");
        return { success: true, proposalId: result.id };
    } catch (e: any) {
        return { error: e.message || "Failed to create proposal" };
    }
}

export async function editProposal(proposalId: string, revision: number, data: {
    name: string;
    proposedSlug: string;
    description: string;
    timeZone: string;
    submissionsCloseAt: string;
    maxTeamSize: number;
}) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const proposal = await tx.eventProposal.findUnique({ where: { id: proposalId } });
            if (!proposal) throw new Error("Proposal not found");
            if (proposal.applicantUserId !== session.user.id) throw new Error("Forbidden");
            if (proposal.status !== "DRAFT" && proposal.status !== "WITHDRAWN" && proposal.status !== "REJECTED") {
                throw new Error("Cannot edit a proposal in this state");
            }

            if (data.proposedSlug !== proposal.proposedSlug) {
                const slugConflict = await tx.event.findUnique({ where: { slug: data.proposedSlug } });
                if (slugConflict) throw new Error("An event with this slug already exists");

                const proposalConflict = await tx.eventProposal.findFirst({
                    where: { proposedSlug: data.proposedSlug, status: { notIn: ["REJECTED", "WITHDRAWN"] } }
                });
                if (proposalConflict && proposalConflict.id !== proposalId) {
                    throw new Error("A pending proposal with this slug already exists");
                }
            }

            const updated = await tx.eventProposal.update({
                where: { id: proposalId, revision: revision },
                data: {
                    name: data.name,
                    proposedSlug: data.proposedSlug,
                    description: data.description,
                    timeZone: data.timeZone,
                    submissionsCloseAt: new Date(data.submissionsCloseAt),
                    maxTeamSize: data.maxTeamSize,
                    status: "SUBMITTED",
                    submittedAt: new Date(),
                    revision: { increment: 1 }
                }
            });

            await tx.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "PROPOSAL_EDITED",
                    entityType: "EventProposal",
                    entityId: proposal.id,
                    metadata: { oldSlug: proposal.proposedSlug, newSlug: data.proposedSlug }
                }
            });
            return updated;
        });

        revalidatePath("/dashboard");
        return { success: true, proposalId: result.id };
    } catch (e: any) {
        if (e.code === 'P2025') return { error: "Proposal was modified by another request. Please refresh." };
        return { error: e.message || "Failed to edit proposal" };
    }
}

export async function withdrawProposal(proposalId: string, revision: number) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        await prisma.$transaction(async (tx) => {
            const proposal = await tx.eventProposal.findUnique({ where: { id: proposalId } });
            if (!proposal) throw new Error("Proposal not found");
            if (proposal.applicantUserId !== session.user.id) throw new Error("Forbidden");
            if (proposal.status !== "DRAFT" && proposal.status !== "SUBMITTED") {
                throw new Error("Cannot withdraw a proposal in this state");
            }

            await tx.eventProposal.update({
                where: { id: proposalId, revision: revision },
                data: { status: "WITHDRAWN", revision: { increment: 1 } }
            });

            await tx.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "PROPOSAL_WITHDRAWN",
                    entityType: "EventProposal",
                    entityId: proposalId,
                    metadata: {}
                }
            });
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2025') return { error: "Proposal was modified by another request. Please refresh." };
        return { error: e.message || "Failed to withdraw proposal" };
    }
}
