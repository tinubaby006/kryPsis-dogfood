"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function reviewProposal(proposalId: string, revision: number, action: "APPROVE" | "REJECT", reason?: string) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isPlatformAdmin) return { error: "Forbidden: Admins only" };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const proposal = await tx.eventProposal.findUnique({ where: { id: proposalId } });
            if (!proposal) throw new Error("Proposal not found");
            
            // Retry returns same event
            if (action === "APPROVE" && proposal.status === "APPROVED" && proposal.approvedEventId) {
                return { success: true, eventId: proposal.approvedEventId };
            }

            if (proposal.status !== "SUBMITTED") throw new Error("Proposal is not in a submitted state");
            if (proposal.revision !== revision) throw new Error("Proposal was modified by another request. Please refresh.");

            if (action === "REJECT") {
                await tx.eventProposal.update({
                    where: { id: proposalId, revision: revision },
                    data: {
                        status: "REJECTED",
                        decisionReason: reason,
                        reviewedById: session.user.id,
                        reviewedAt: new Date(),
                        revision: { increment: 1 }
                    }
                });
                
                await tx.auditLog.create({
                    data: {
                        actorUserId: session.user.id,
                        action: "PROPOSAL_REJECTED",
                        entityType: "EventProposal",
                        entityId: proposalId,
                        metadata: { reason: reason || "" }
                    }
                });
                return { success: true };
            }

            // APPROVE logic
            const ev = await tx.event.create({
                data: {
                    slug: proposal.proposedSlug,
                    name: proposal.name,
                    description: proposal.description,
                    startsAt: proposal.startsAt,
                    endsAt: proposal.endsAt,
                    submissionsOpenAt: proposal.submissionsOpenAt,
                    submissionsCloseAt: proposal.submissionsCloseAt,
                    visibility: "DRAFT",
                    maxTeamSize: proposal.maxTeamSize,
                    createdById: proposal.applicantUserId,
                    timeZone: proposal.timeZone
                }
            });

            await tx.eventRole.create({
                data: {
                    eventId: ev.id,
                    userId: proposal.applicantUserId,
                    role: "ORGANIZER"
                }
            });

            await tx.eventProposal.update({
                where: { id: proposalId, revision: revision },
                data: {
                    status: "APPROVED",
                    decisionReason: reason,
                    reviewedById: session.user.id,
                    reviewedAt: new Date(),
                    approvedEventId: ev.id,
                    revision: { increment: 1 }
                }
            });

            await tx.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "PROPOSAL_APPROVED",
                    entityType: "EventProposal",
                    entityId: proposalId,
                    metadata: { eventId: ev.id, reason: reason || "" }
                }
            });

            return { success: true, eventId: ev.id };
        });

        revalidatePath("/admin/proposals");
        return result;
    } catch (e: any) {
        if (e.code === 'P2025') return { error: "Proposal was modified by another request. Please refresh." };
        return { error: e.message || "Failed to review proposal" };
    }
}
