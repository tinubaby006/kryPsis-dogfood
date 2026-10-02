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

        const proposal = await prisma.eventProposal.create({
            data: {
                applicantUserId: session.user.id,
                name: data.name,
                proposedSlug: data.proposedSlug,
                description: data.description,
                timeZone: data.timeZone,
                submissionsCloseAt: new Date(data.submissionsCloseAt),
                maxTeamSize: data.maxTeamSize,
                status: "SUBMITTED", // Immediately submitted for review
                submittedAt: new Date()
            }
        });

        revalidatePath("/dashboard");
        return { success: true, proposalId: proposal.id };
    } catch (e: any) {
        return { error: e.message || "Failed to create proposal" };
    }
}

export async function withdrawProposal(proposalId: string) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        const proposal = await prisma.eventProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return { error: "Proposal not found" };
        if (proposal.applicantUserId !== session.user.id) return { error: "Forbidden" };
        if (proposal.status !== "DRAFT" && proposal.status !== "SUBMITTED") {
            return { error: "Cannot withdraw a proposal in this state" };
        }

        await prisma.eventProposal.update({
            where: { id: proposalId },
            data: { status: "WITHDRAWN" }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Failed to withdraw proposal" };
    }
}
