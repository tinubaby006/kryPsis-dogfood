"use server";

import { prisma } from "@/lib/db";
import { requireJudgeAssignment, PermissionError } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function saveDraftAction(eventId: string, assignmentId: string, scores: Record<string, number>, comment: string) {
    try {
        // Optimistic check
        const { assignment } = await requireJudgeAssignment(eventId, assignmentId, { mode: 'write' });
        const stageId = assignment.stageId;

        // Transactionally commit
        await prisma.$transaction(async (tx) => {
            // 1. Lock in deterministic order: Event -> JudgingStage -> RubricAssignment
            await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "JudgingStage" WHERE id = ${stageId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "RubricAssignment" WHERE id = ${assignmentId} FOR UPDATE`;

            // 2. Recheck write permissions inside the lock
            await requireJudgeAssignment(eventId, assignmentId, { mode: 'write' }, tx);

            const rubricVersion = await tx.rubricVersion.findFirst({
                where: { stageId },
                include: { criteria: true },
                orderBy: { createdAt: 'desc' }
            });
            if (!rubricVersion) throw new Error("500 INTERNAL_SERVER_ERROR: No rubric found");

            const expectedKeys = new Set(rubricVersion.criteria.map(c => c.id));
            const actualKeys = Object.keys(scores);
            if (actualKeys.length !== expectedKeys.size || !actualKeys.every(k => expectedKeys.has(k))) {
                throw new Error("422 UNPROCESSABLE: Scores do not match rubric criteria exactly");
            }

            for (const crit of rubricVersion.criteria) {
                const val = scores[crit.id];
                if (val === undefined || val === null || !Number.isFinite(val) || !Number.isInteger(val)) {
                    throw new Error(`422 UNPROCESSABLE: Invalid or missing score for ${crit.title}`);
                }
                if (val < 0 || val > crit.maxScore) {
                    throw new Error(`422 UNPROCESSABLE: Score for ${crit.title} is out of range (0-${crit.maxScore})`);
                }
            }

            if (comment && comment.length > 5000) {
                throw new Error("422 UNPROCESSABLE: Comment is too long (max 5000 chars)");
            }

            // Check if final review exists
            const finalReview = await tx.stageReview.findUnique({ where: { assignmentId } });
            if (finalReview) {
                throw new Error("409 CONFLICT: Cannot save draft after final submission");
            }

            await tx.reviewDraft.upsert({
                where: { assignmentId },
                update: {
                    scores,
                    comment,
                    revision: { increment: 1 }
                },
                create: {
                    assignmentId,
                    judgeUserId: assignment.judgeUserId,
                    scores,
                    comment
                }
            });
        });

        revalidatePath(`/events/${eventId}/judge`);
        revalidatePath(`/events/${eventId}/judge/assignments/${assignmentId}`);
        return { success: true };
    } catch (e: any) {
        if (e instanceof PermissionError) return { error: e.message };
        return { error: e.message };
    }
}

export async function submitReviewAction(eventId: string, assignmentId: string, scores: Record<string, number>, comment: string) {
    try {
        // Optimistic check
        const { assignment } = await requireJudgeAssignment(eventId, assignmentId, { mode: 'write' });
        const stageId = assignment.stageId;

        return await prisma.$transaction(async (tx) => {
            // 1. Lock in deterministic order
            await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "JudgingStage" WHERE id = ${stageId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "RubricAssignment" WHERE id = ${assignmentId} FOR UPDATE`;

            // 2. Recheck write permissions inside the lock
            await requireJudgeAssignment(eventId, assignmentId, { mode: 'write' }, tx);

            const rubricVersion = await tx.rubricVersion.findFirst({
                where: { stageId },
                include: { criteria: true },
                orderBy: { createdAt: 'desc' }
            });
            if (!rubricVersion) throw new Error("500 INTERNAL_SERVER_ERROR: No rubric found");

            const expectedKeys = new Set(rubricVersion.criteria.map(c => c.id));
            const actualKeys = Object.keys(scores);
            if (actualKeys.length !== expectedKeys.size || !actualKeys.every(k => expectedKeys.has(k))) {
                throw new Error("422 UNPROCESSABLE: Scores do not match rubric criteria exactly");
            }

            for (const crit of rubricVersion.criteria) {
                const val = scores[crit.id];
                if (val === undefined || val === null || !Number.isFinite(val) || !Number.isInteger(val)) {
                    throw new Error(`422 UNPROCESSABLE: Invalid or missing score for ${crit.title}`);
                }
                if (val < 0 || val > crit.maxScore) {
                    throw new Error(`422 UNPROCESSABLE: Score for ${crit.title} is out of range (0-${crit.maxScore})`);
                }
            }
            
            if (comment && comment.length > 5000) {
                throw new Error("422 UNPROCESSABLE: Comment is too long (max 5000 chars)");
            }

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
                    submittedAt: new Date(),
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

            revalidatePath(`/events/${eventId}/judge`);
            revalidatePath(`/events/${eventId}/judge/assignments/${assignmentId}`);
            return { success: true };
        });
    } catch (e: any) {
        if (e instanceof PermissionError) return { error: e.message };
        return { error: e.message };
    }
}
