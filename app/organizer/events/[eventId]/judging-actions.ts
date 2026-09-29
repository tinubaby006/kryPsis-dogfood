"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { judgingStageSchema, rubricConfigSchema } from "@/lib/schema";
import { advanceStageState } from "@/lib/judging/state";
import { revalidatePath } from "next/cache";
import * as crypto from "crypto";

async function requireOrganizer(eventId: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    const role = await prisma.eventRole.findFirst({
        where: { eventId, userId: session.user.id, role: "ORGANIZER" }
    });
    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!role && !adminUser?.isPlatformAdmin) throw new Error("Forbidden");
    return session.user.id;
}

export async function createOrUpdateJudgingStage(eventId: string, data: any) {
    const userId = await requireOrganizer(eventId);
    
    const parsed = judgingStageSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const stageData = parsed.data;

    try {
        let stage;
        if (stageData.id) {
            stage = await prisma.judgingStage.findUnique({ where: { id: stageData.id } });
            if (!stage) return { error: "Stage not found" };
            if (stage.eventId !== eventId) return { error: "Event mismatch" };
            if (!["DRAFT", "CONFIGURED"].includes(stage.state)) {
                return { error: "Cannot edit stage once assignments have started" };
            }

            stage = await prisma.judgingStage.update({
                where: { id: stage.id },
                data: {
                    name: stageData.name,
                    scope: stageData.scope as any,
                    trackId: stageData.trackId,
                    scopeKey: stageData.scope === "TRACK" ? stageData.trackId! : eventId,
                    requiredReviews: stageData.requiredReviews,
                    startsAt: stageData.startsAt ? new Date(stageData.startsAt) : null,
                    endsAt: stageData.endsAt ? new Date(stageData.endsAt) : null,
                }
            });
            // Editing stage config invalidates CONFIGURED state if it changes scope significantly, 
            // but for safety, we just force back to DRAFT if we want strictness.
            if (stage.state === "CONFIGURED") {
                 await advanceStageState(stage.id, "DRAFT", userId, "Stage settings updated");
            }
        } else {
            stage = await prisma.judgingStage.create({
                data: {
                    eventId,
                    name: stageData.name,
                    scope: stageData.scope as any,
                    trackId: stageData.trackId,
                    scopeKey: stageData.scope === "TRACK" ? stageData.trackId! : eventId,
                    requiredReviews: stageData.requiredReviews,
                    startsAt: stageData.startsAt ? new Date(stageData.startsAt) : null,
                    endsAt: stageData.endsAt ? new Date(stageData.endsAt) : null,
                }
            });
            await prisma.auditEvent.create({
                data: {
                    stageId: stage.id,
                    eventId,
                    actorUserId: userId,
                    action: "STAGE_CREATED",
                    entityType: "JudgingStage",
                    entityId: stage.id,
                    metadata: { name: stage.name }
                }
            });
        }
        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true, stageId: stage.id };
    } catch (e: any) {
        return { error: e.message || "Failed to save stage" };
    }
}

export async function saveRubricConfig(eventId: string, stageId: string, criteriaData: any[]) {
    const userId = await requireOrganizer(eventId);
    
    const parsed = rubricConfigSchema.safeParse({ criteria: criteriaData });
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    try {
        const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
        if (!stage) return { error: "Stage not found" };
        if (!["DRAFT", "CONFIGURED"].includes(stage.state)) {
            return { error: "Cannot edit rubric once assignments have started" };
        }

        await prisma.$transaction(async (tx) => {
            // Delete old rubric for this stage (we only keep 1 active version before OPEN)
            // Once OPEN, we freeze it. Since we are in DRAFT/CONFIGURED, we can safely replace it.
            await tx.rubricVersion.deleteMany({ where: { stageId } });
            
            const versionHash = Math.random().toString(36).substring(7); // Simplistic versioning for pre-OPEN
            const rubric = await tx.rubricVersion.create({
                data: { stageId, versionHash }
            });

            for (let i = 0; i < parsed.data.criteria.length; i++) {
                const c = parsed.data.criteria[i];
                await tx.rubricCriterion.create({
                    data: {
                        rubricVersionId: rubric.id,
                        key: c.key,
                        title: c.title,
                        weightBasisPts: c.weightBasisPts,
                        maxScore: c.maxScore,
                        sortOrder: i
                    }
                });
            }
        });

        // If it was DRAFT, it's now CONFIGURED (if valid). 
        if (stage.state === "DRAFT") {
            await advanceStageState(stageId, "CONFIGURED", userId, "Rubric configured");
        }

        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Failed to save rubric" };
    }
}

export async function startAssignments(eventId: string, stageId: string) {
    const userId = await requireOrganizer(eventId);
    
    try {
        const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
        if (!stage) return { error: "Stage not found" };
        if (stage.state !== "CONFIGURED") return { error: "Stage must be CONFIGURED to generate assignments" };

        await prisma.$transaction(async (tx) => {
            const eligibleJudges = stage.scope === "TRACK" 
                ? await tx.judgeTrack.findMany({ where: { eventId, trackId: stage.trackId! } })
                : await tx.eventRole.findMany({ where: { eventId, role: "JUDGE" } });
            
            await tx.stageJudge.deleteMany({ where: { stageId } });
            await tx.stageJudge.createMany({
                data: eligibleJudges.map(j => ({
                    stageId,
                    judgeUserId: j.userId,
                    isActive: true
                }))
            });

            const projects = stage.scope === "TRACK"
                ? await tx.project.findMany({ where: { eventId, trackId: stage.trackId!, status: "SUBMITTED" } })
                : await tx.project.findMany({ where: { eventId, status: "SUBMITTED" } });
            
            await tx.stageProject.deleteMany({ where: { stageId } });
            await tx.stageProject.createMany({
                data: projects.map(p => ({
                    stageId,
                    projectId: p.id,
                    eventId: p.eventId,
                    versionSnapshot: p.version
                }))
            });

            await tx.judgingStage.update({ where: { id: stageId }, data: { state: "ASSIGNING" } });
            
            await tx.auditEvent.create({
                data: {
                    stageId, eventId, actorUserId: userId, action: "STAGE_ASSIGNING",
                    entityType: "JudgingStage", entityId: stageId,
                    metadata: { judges: eligibleJudges.length, projects: projects.length }
                }
            });
        });

        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

import { generateAssignmentPreview, commitAssignmentRun } from "@/lib/judging/assignment";

export async function getAssignmentPreviewAction(eventId: string, stageId: string) {
    await requireOrganizer(eventId);
    try {
        const preview = await generateAssignmentPreview(stageId);
        return { success: true, preview };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function commitAssignmentAction(eventId: string, stageId: string, configHash: string, inputHash: string) {
    const userId = await requireOrganizer(eventId);
    try {
        const result = await commitAssignmentRun(stageId, userId, configHash, inputHash);
        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true, result };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function closeJudgingStage(eventId: string, stageId: string) {
    const userId = await requireOrganizer(eventId);
    try {
        const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
        if (!stage) return { error: "Stage not found" };
        if (stage.state !== "OPEN") return { error: "Stage must be OPEN to close" };

        await prisma.judgingStage.update({ where: { id: stageId }, data: { state: "CLOSED" } });
        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function finalizeCalculation(eventId: string, stageId: string, calculationRunId: string) {
    const userId = await requireOrganizer(eventId);
    try {
        const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
        if (!stage) return { error: "Stage not found" };
        if (stage.state !== "CALCULATED") return { error: "Stage must be CALCULATED to finalize" };

        const run = await prisma.calculationRun.findUnique({
            where: { id: calculationRunId, stageId },
            include: { projectResults: true }
        });
        if (!run) return { error: "Calculation run not found" };

        // "Incomplete stages cannot silently finalize."
        // We could check if all assignments are completed.
        const pending = await prisma.rubricAssignment.count({
            where: { stageId, status: "PENDING" }
        });
        if (pending > 0) {
            return { error: `Cannot finalize: ${pending} assignments are still pending.` };
        }

        const canonicalHashStr = run.projectResults.sort((a,b) => (a.rank||0) - (b.rank||0)).map(r => `${r.projectId}:${r.normalizedMean}`).join(",");
        const canonicalHash = crypto.createHash("sha256").update(canonicalHashStr).digest("hex");

        await prisma.$transaction(async (tx) => {
            await tx.finalizationSnapshot.create({
                data: {
                    stageId,
                    calculationRunId: run.id,
                    canonicalHash,
                    finalizedById: userId,
                    snapshotData: { runId: run.id, resultsCount: run.projectResults.length }
                }
            });

            await tx.judgingStage.update({
                where: { id: stageId },
                data: { state: "FINALIZED" }
            });
        });

        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

import { generateCalculationPreview, commitCalculationRun } from "@/lib/judging/calculation";

export async function getCalculationPreviewAction(eventId: string, stageId: string) {
    await requireOrganizer(eventId);
    try {
        const preview = await generateCalculationPreview(stageId);
        return { success: true, preview };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function commitCalculationAction(eventId: string, stageId: string, inputHash: string, configHash: string) {
    await requireOrganizer(eventId);
    try {
        const result = await commitCalculationRun(stageId, inputHash, configHash);
        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true, result };
    } catch (e: any) {
        return { error: e.message };
    }
}
