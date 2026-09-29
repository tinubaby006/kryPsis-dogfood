"use server";

import { prisma } from "@/lib/db";
import { requireJudgeAccess } from "@/lib/judging/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function saveDraftAction(eventId: string, assignmentId: string, scores: Record<string, number>, comment: string) {
    try {
        const authCtx = await requireJudgeAccess(eventId, assignmentId);
        const assignment = authCtx.assignment as any;

        if (!assignment || assignment.finalReview) {
            return { error: "409 CONFLICT: Cannot save draft after final submission" };
        }

        await prisma.reviewDraft.upsert({
            where: { assignmentId },
            update: {
                scores,
                comment,
                revision: { increment: 1 }
            },
            create: {
                assignmentId,
                judgeUserId: authCtx.userId,
                scores,
                comment
            }
        });

        revalidatePath(`/events/${eventId}/judge`);
        revalidatePath(`/events/${eventId}/judge/assignments/${assignmentId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function submitReviewAction(eventId: string, assignmentId: string, scores: Record<string, number>, comment: string) {
    try {
        const authCtx = await requireJudgeAccess(eventId, assignmentId);
        const stage = authCtx.stage!;

        // Fetch rubric criteria
        const rubricVersion = await prisma.rubricVersion.findFirst({
            where: { stageId: stage.id },
            include: { criteria: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!rubricVersion) {
            return { error: "500 INTERNAL_SERVER_ERROR: No rubric found for this stage" };
        }

        // Validate score keys and values
        for (const crit of rubricVersion.criteria) {
            const val = scores[crit.id];
            if (val === undefined || val === null || isNaN(val)) {
                return { error: `422 UNPROCESSABLE: Missing score for ${crit.title}` };
            }
            if (val < 0 || val > crit.maxScore) {
                return { error: `422 UNPROCESSABLE: Score for ${crit.title} is out of range (0-${crit.maxScore})` };
            }
        }

        // Transactionally commit
        await prisma.$transaction(async (tx) => {
            const existing = await tx.stageReview.findUnique({
                where: { assignmentId },
                include: { scores: true }
            });

            if (existing) {
                // Idempotent retry logic
                // Check if identical submission
                let identical = existing.comment === comment;
                if (identical) {
                    for (const es of existing.scores) {
                        if (scores[es.criterionId] !== es.value) {
                            identical = false;
                            break;
                        }
                    }
                }
                
                if (identical) {
                    return { success: true, message: "Already submitted" };
                } else {
                    throw new Error("409 CONFLICT: Review already submitted with different data");
                }
            }

            const reviewId = `rev_${crypto.randomBytes(8).toString('hex')}`;

            await tx.stageReview.create({
                data: {
                    id: reviewId,
                    assignmentId,
                    rubricVersionId: rubricVersion.id,
                    comment,
                    scores: {
                        create: Object.entries(scores).map(([critId, val]) => ({
                            criterionId: critId,
                            value: val
                        }))
                    }
                }
            });

            // Update assignment status
            await tx.rubricAssignment.update({
                where: { id: assignmentId },
                data: { status: "COMPLETED" }
            });

            // Delete draft if exists
            await tx.reviewDraft.deleteMany({
                where: { assignmentId }
            });
        });

        revalidatePath(`/events/${eventId}/judge`);
        revalidatePath(`/events/${eventId}/judge/assignments/${assignmentId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
