"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseLocalInTimezone } from "@/lib/utils";

export async function createProposal(data: {
    name: string;
    proposedSlug: string;
    description: string;
    timeZone: string;
    submissionsCloseAt: string;
    maxTeamSize: number;
    tracksMode: "SINGLE_POOL" | "MULTI_TRACK";
}) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        if (!data.name || data.name.trim().length < 2) return { error: "Event name must be at least 2 characters" };
        if (!/^[a-z0-9-]+$/.test(data.proposedSlug)) return { error: "Slug must contain only lowercase letters, numbers, and hyphens" };
        if (!["SINGLE_POOL", "MULTI_TRACK"].includes(data.tracksMode)) return { error: "Invalid tracks mode" };
        if (data.maxTeamSize < 1 || data.maxTeamSize > 20) return { error: "Max team size must be between 1 and 20" };
        
        try {
            Intl.DateTimeFormat(undefined, { timeZone: data.timeZone });
        } catch (e) {
            return { error: "Invalid timezone" };
        }

        const closingDate = parseLocalInTimezone(data.submissionsCloseAt, data.timeZone);
        if (isNaN(closingDate.getTime())) return { error: "Invalid submissions close date" };

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
                    tracksMode: data.tracksMode,
                    submissionsCloseAt: parseLocalInTimezone(data.submissionsCloseAt, data.timeZone),
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
    tracksMode: "SINGLE_POOL" | "MULTI_TRACK";
}) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        if (!data.name || data.name.trim().length < 2) return { error: "Event name must be at least 2 characters" };
        if (!/^[a-z0-9-]+$/.test(data.proposedSlug)) return { error: "Slug must contain only lowercase letters, numbers, and hyphens" };
        if (!["SINGLE_POOL", "MULTI_TRACK"].includes(data.tracksMode)) return { error: "Invalid tracks mode" };
        if (data.maxTeamSize < 1 || data.maxTeamSize > 20) return { error: "Max team size must be between 1 and 20" };
        
        try {
            Intl.DateTimeFormat(undefined, { timeZone: data.timeZone });
        } catch (e) {
            return { error: "Invalid timezone" };
        }

        const closingDate = parseLocalInTimezone(data.submissionsCloseAt, data.timeZone);
        if (isNaN(closingDate.getTime())) return { error: "Invalid submissions close date" };

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
                    tracksMode: data.tracksMode,
                    submissionsCloseAt: parseLocalInTimezone(data.submissionsCloseAt, data.timeZone),
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
