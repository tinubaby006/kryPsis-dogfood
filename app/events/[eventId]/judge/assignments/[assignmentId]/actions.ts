"use server";

import { prisma } from "@/lib/db";
import { requireJudgeAccess } from "@/lib/judging/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function saveDraftAction(eventId: string, assignmentId: string, scores: Record<string, number>, comment: string) {
    try {
        const authCtx = await requireJudgeAccess(eventId, assignmentId, { requireWrite: true });
        const stage = authCtx.stage!;

        // Validate rubric
        const rubricVersion = await prisma.rubricVersion.findFirst({
            where: { stageId: stage.id },
            include: { criteria: true },
            orderBy: { createdAt: 'desc' }
        });
        if (!rubricVersion) return { error: "500 INTERNAL_SERVER_ERROR: No rubric found" };

        const expectedKeys = new Set(rubricVersion.criteria.map(c => c.id));
        const actualKeys = Object.keys(scores);
        if (actualKeys.length !== expectedKeys.size || !actualKeys.every(k => expectedKeys.has(k))) {
            return { error: "422 UNPROCESSABLE: Scores do not match rubric criteria exactly" };
        }

        for (const crit of rubricVersion.criteria) {
            const val = scores[crit.id];
            if (val === undefined || val === null || !Number.isFinite(val) || !Number.isInteger(val)) {
                return { error: `422 UNPROCESSABLE: Invalid or missing score for ${crit.title}` };
            }
            if (val < 0 || val > crit.maxScore) {
                return { error: `422 UNPROCESSABLE: Score for ${crit.title} is out of range (0-${crit.maxScore})` };
            }
        }

        // Check if final review exists
        const finalReview = await prisma.stageReview.findUnique({ where: { assignmentId } });
        if (finalReview) {
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
        const authCtx = await requireJudgeAccess(eventId, assignmentId, { requireWrite: true });
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

        const expectedKeys = new Set(rubricVersion.criteria.map(c => c.id));
        const actualKeys = Object.keys(scores);
        if (actualKeys.length !== expectedKeys.size || !actualKeys.every(k => expectedKeys.has(k))) {
            return { error: "422 UNPROCESSABLE: Scores do not match rubric criteria exactly" };
        }

        // Validate score keys and values
        for (const crit of rubricVersion.criteria) {
            const val = scores[crit.id];
            if (val === undefined || val === null || !Number.isFinite(val) || !Number.isInteger(val)) {
                return { error: `422 UNPROCESSABLE: Invalid or missing score for ${crit.title}` };
            }
            if (val < 0 || val > crit.maxScore) {
                return { error: `422 UNPROCESSABLE: Score for ${crit.title} is out of range (0-${crit.maxScore})` };
            }
        }

        // Transactionally commit
        await prisma.$transaction(async (tx) => {
            // Recheck state and deadlines inside transaction
            const currentStage = await tx.judgingStage.findUnique({ where: { id: stage.id } });
            if (currentStage?.state !== "OPEN") throw new Error("403 FORBIDDEN: Stage no longer OPEN");
            
            const now = new Date();
            if (currentStage.startsAt && now < currentStage.startsAt) throw new Error("403 FORBIDDEN: Judging period has not started yet");
            if (currentStage.endsAt && now > currentStage.endsAt) throw new Error("403 FORBIDDEN: Judging period has ended");

            const currentAsn = await tx.rubricAssignment.findUnique({ where: { id: assignmentId } });
            if (!currentAsn || currentAsn.status === "CANCELLED") throw new Error("403 FORBIDDEN: Assignment cancelled");

            const existing = await tx.stageReview.findUnique({
                where: { assignmentId },
                include: { scores: true }
            });

            if (existing) {
                // Idempotent retry logic
                let identical = existing.comment === comment;
                if (identical && existing.scores.length === actualKeys.length) {
                    for (const es of existing.scores) {
                        if (scores[es.criterionId] !== es.value) {
                            identical = false;
                            break;
                        }
                    }
                } else {
                    identical = false;
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
