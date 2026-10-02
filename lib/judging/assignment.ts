import { prisma } from "@/lib/db";
import { advanceStageState } from "./state";
import * as crypto from "crypto";

// Simple deterministic PRNG (Mulberry32)
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
}

export type AssignmentDiagnostic = 
    | { status: "VALID" }
    | { status: "INVALID_CONFIG", reason: string }
    | { status: "INFEASIBLE", reason: string }
    | { status: "CONSTRUCTION_FAILED", reason: string };

export async function generateAssignmentPreview(stageId: string, txClient: any = prisma) {
    const stage = await txClient.judgingStage.findUnique({
        where: { id: stageId },
        include: { event: true }
    });
    
    if (!stage) throw new Error("Stage not found");

    const liveProjects = stage.scope === "TRACK"
        ? await txClient.project.findMany({ 
            where: { eventId: stage.eventId, trackId: stage.trackId, status: "SUBMITTED" }, 
            include: { team: { include: { members: true } } }, 
            orderBy: { id: 'asc' } 
          })
        : await txClient.project.findMany({ 
            where: { eventId: stage.eventId, status: "SUBMITTED" }, 
            include: { team: { include: { members: true } } }, 
            orderBy: { id: 'asc' } 
          });

    const stageProjects = liveProjects.map((p: any) => ({ projectId: p.id, project: p }));

    let activeJudges: { userId: string }[] = [];
    if (stage.scope === "TRACK") {
        activeJudges = await txClient.judgeTrack.findMany({ 
            where: { eventId: stage.eventId, trackId: stage.trackId }, 
            orderBy: { userId: 'asc' } 
        });
    } else {
        activeJudges = await txClient.eventRole.findMany({ 
            where: { eventId: stage.eventId, role: "JUDGE" }, 
            orderBy: { userId: 'asc' } 
        });
    }

    const stageJudges = activeJudges.map((j: any) => ({ judgeUserId: j.userId }));

    const R = stage.requiredReviews;
    const N = stageProjects.length;
    const J = stageJudges.length;

    if (R < 1) return { diagnostic: { status: "INVALID_CONFIG", reason: "R must be >= 1" } };
    if (N === 0) return { diagnostic: { status: "INVALID_CONFIG", reason: "No projects in stage" } };
    if (J === 0) return { diagnostic: { status: "INVALID_CONFIG", reason: "No active judges in stage" } };

    const conflicts = new Set<string>();
    for (const sp of stageProjects) {
        for (const member of sp.project.team.members) {
            for (const sj of stageJudges) {
                if (sj.judgeUserId === member.userId) {
                    conflicts.add(`${sp.projectId}:${sj.judgeUserId}`);
                }
            }
        }
    }

    const maxCapacity = Math.ceil((N * R) / J) + 1;

    for (const sp of stageProjects) {
        let eligible = 0;
        for (const sj of stageJudges) {
            if (!conflicts.has(`${sp.projectId}:${sj.judgeUserId}`)) eligible++;
        }
        if (eligible < R) {
            return { diagnostic: { status: "INFEASIBLE", reason: `Project ${sp.projectId} only has ${eligible} eligible judges (needs ${R})` } };
        }
    }

    if (R > J) {
        return { diagnostic: { status: "INFEASIBLE", reason: `R (${R}) is greater than active panel size (${J})` } };
    }

    const seed = hashStringToInt(stageId + stageProjects.map((p: any)=>p.projectId).join("") + stageJudges.map((j: any)=>j.judgeUserId).join(""));
    const prng = mulberry32(seed);

    let assignments: { projectId: string, judgeUserId: string }[] = [];
    const judgeLoads = new Map<string, number>();
    for (const sj of stageJudges) judgeLoads.set(sj.judgeUserId, 0);

    for (const sp of stageProjects) {
        const eligibleJudges = stageJudges.filter((sj: any) => !conflicts.has(`${sp.projectId}:${sj.judgeUserId}`));
        
        eligibleJudges.sort((a: any, b: any) => {
            const loadA = judgeLoads.get(a.judgeUserId)!;
            const loadB = judgeLoads.get(b.judgeUserId)!;
            if (loadA !== loadB) return loadA - loadB;
            return prng() - 0.5;
        });

        const selected = eligibleJudges.slice(0, R);
        if (selected.length < R) {
            return { diagnostic: { status: "CONSTRUCTION_FAILED", reason: `Greedy construction failed to find ${R} judges for ${sp.projectId} (conflicts/capacity)` } };
        }

        for (const sj of selected) {
            assignments.push({ projectId: sp.projectId, judgeUserId: sj.judgeUserId });
            judgeLoads.set(sj.judgeUserId, judgeLoads.get(sj.judgeUserId)! + 1);
        }
    }

    let isConnected = true;
    if (J > 1 && R > 1) {
        const adj = new Map<string, Set<string>>();
        for (const sj of stageJudges) adj.set(sj.judgeUserId, new Set());

        for (const sp of stageProjects) {
            const assignedToProject = assignments.filter((a: any) => a.projectId === sp.projectId).map((a: any) => a.judgeUserId);
            for (let i = 0; i < assignedToProject.length; i++) {
                for (let j = i + 1; j < assignedToProject.length; j++) {
                    adj.get(assignedToProject[i])!.add(assignedToProject[j]);
                    adj.get(assignedToProject[j])!.add(assignedToProject[i]);
                }
            }
        }

        const visited = new Set<string>();
        const queue = [stageJudges[0].judgeUserId];
        visited.add(stageJudges[0].judgeUserId);

        while(queue.length > 0) {
            const curr = queue.shift()!;
            for (const neighbor of adj.get(curr)!) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        const assignedJudges = new Set(assignments.map((a: any) => a.judgeUserId));
        if (visited.size < assignedJudges.size) {
            return { diagnostic: { status: "CONSTRUCTION_FAILED", reason: "Overlap graph is disconnected, blocking calibration." } };
        }
    }

    const configHash = crypto.createHash("sha256").update(JSON.stringify({ R, stageId, maxCapacity })).digest("hex");
    const inputHash = crypto.createHash("sha256").update(JSON.stringify({ 
        projects: stageProjects.map((p: any)=>p.projectId), 
        judges: stageJudges.map((j: any)=>j.judgeUserId),
        conflicts: Array.from(conflicts)
    })).digest("hex");

    return {
        diagnostic: { status: "VALID" as const },
        assignments,
        stats: {
            N, J, R,
            loads: Object.fromEntries(judgeLoads),
            conflictsCount: conflicts.size
        },
        configHash,
        inputHash,
        stageProjects,
        stageJudges
    };
}

export async function commitAssignmentRun(stageId: string, actorId: string, configHash: string, inputHash: string) {
    return await prisma.$transaction(async (tx) => {
        const stage = await tx.judgingStage.findUnique({ where: { id: stageId } });
        if (!stage) throw new Error("Stage not found");
        if (stage.state !== "CONFIGURED" && stage.state !== "ASSIGNING") {
            throw new Error(`Cannot commit assignments in state ${stage.state}. Stage must be CONFIGURED or ASSIGNING.`);
        }

        const existingRun = await tx.assignmentRun.findFirst({
            where: { stageId }
        });

        if (existingRun) {
            if (existingRun.configHash === configHash && existingRun.inputHash === inputHash) {
                return { success: true, runId: existingRun.id, message: "Already committed" };
            } else {
                throw new Error("409 CONFLICT: A different assignment run was already committed.");
            }
        }

        const preview = await generateAssignmentPreview(stageId, tx);
        if (preview.diagnostic.status !== "VALID") {
            throw new Error(`422 UNPROCESSABLE: Configuration became invalid: ${preview.diagnostic.reason}`);
        }

        if (preview.configHash !== configHash || preview.inputHash !== inputHash) {
            throw new Error("409 CONFLICT: Stale preview. The panel or population has changed. Please preview again.");
        }

        // Snapshot population
        await tx.stageJudge.deleteMany({ where: { stageId } });
        await tx.stageProject.deleteMany({ where: { stageId } });

        await tx.stageJudge.createMany({
            data: preview.stageJudges!.map((sj: any) => ({
                stageId, judgeUserId: sj.judgeUserId, isActive: true
            }))
        });

        await tx.stageProject.createMany({
            data: preview.stageProjects!.map((sp: any) => ({
                stageId, projectId: sp.projectId, eventId: stage.eventId, versionSnapshot: sp.project.version
            }))
        });

        const lastRun = await tx.assignmentRun.findFirst({
            where: { stageId },
            orderBy: { version: 'desc' }
        });
        const nextVersion = lastRun ? lastRun.version + 1 : 1;

        const runId = `run_${crypto.randomBytes(8).toString('hex')}`;
        const run = await tx.assignmentRun.create({
            data: {
                id: runId,
                stageId,
                configHash,
                inputHash,
                version: nextVersion,
                actorUserId: actorId
            }
        });

        const assignmentsData = preview.assignments!.map((a: any) => ({
            id: `asn_${crypto.randomBytes(8).toString('hex')}`,
            stageId,
            projectId: a.projectId,
            judgeUserId: a.judgeUserId,
            runId: run.id,
            status: "PENDING"
        }));

        await tx.rubricAssignment.createMany({
            data: assignmentsData
        });

        await tx.judgingStage.update({ where: { id: stageId }, data: { state: "OPEN" } });

        await tx.auditEvent.create({
            data: {
                stageId,
                actorUserId: actorId,
                action: "ASSIGNMENTS_COMMITTED",
                entityType: "AssignmentRun",
                entityId: run.id,
                metadata: { totalAssignments: assignmentsData.length }
            }
        });

        return { success: true, runId: run.id };
    });
}
