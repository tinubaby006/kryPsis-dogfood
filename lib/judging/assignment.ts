import { prisma } from "@/lib/db";
import { advanceStageState } from "./state";
import * as crypto from "crypto";
import { AssignmentStatus } from "@prisma/client";


export type AssignmentDiagnostic = 
    | { status: "VALID" }
    | { status: "INVALID_CONFIG", reason: string }
    | { status: "INFEASIBLE", reason: string }
    | { status: "CONSTRUCTION_FAILED", reason: string };

function getComponents(judges: any[], projects: any[], assignments: any[]) {
    const adj = new Map<string, Set<string>>();
    for (const sj of judges) adj.set(sj.judgeUserId, new Set());

    for (const sp of projects) {
        const assignedToProject = assignments.filter((a: any) => a.projectId === sp.projectId).map((a: any) => a.judgeUserId);
        for (let i = 0; i < assignedToProject.length; i++) {
            for (let j = i + 1; j < assignedToProject.length; j++) {
                adj.get(assignedToProject[i])!.add(assignedToProject[j]);
                adj.get(assignedToProject[j])!.add(assignedToProject[i]);
            }
        }
    }

    const visited = new Set<string>();
    const components: Set<string>[] = [];

    for (const sj of judges) {
        if (!visited.has(sj.judgeUserId)) {
            const comp = new Set<string>();
            const queue = [sj.judgeUserId];
            visited.add(sj.judgeUserId);
            comp.add(sj.judgeUserId);

            while(queue.length > 0) {
                const curr = queue.shift()!;
                for (const neighbor of adj.get(curr)!) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        comp.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            components.push(comp);
        }
    }
    return components;
}

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

    const existingStageJudges = await txClient.stageJudge.findMany({
        where: { stageId }
    });
    const capacityMap = new Map<string, number | null>();
    for (const sj of existingStageJudges) {
        if (sj.capacity !== null) capacityMap.set(sj.judgeUserId, sj.capacity);
    }

    const stageJudges = activeJudges.map((j: any) => ({ 
        judgeUserId: j.userId,
        capacity: capacityMap.get(j.userId)
    }));

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

    let assignments: { projectId: string, judgeUserId: string }[] = [];
    const judgeLoads = new Map<string, number>();
    for (const sj of stageJudges) judgeLoads.set(sj.judgeUserId, 0);

    for (const sp of stageProjects) {
        const eligibleJudges = stageJudges.filter((sj: any) => 
            !conflicts.has(`${sp.projectId}:${sj.judgeUserId}`) && 
            judgeLoads.get(sj.judgeUserId)! < (sj.capacity !== undefined && sj.capacity !== null ? sj.capacity : maxCapacity)
        );
        
        eligibleJudges.sort((a: any, b: any) => {
            const loadA = judgeLoads.get(a.judgeUserId)!;
            const loadB = judgeLoads.get(b.judgeUserId)!;
            if (loadA !== loadB) return loadA - loadB;
            const hashA = crypto.createHash("sha256").update(sp.projectId + ":" + a.judgeUserId).digest("hex");
            const hashB = crypto.createHash("sha256").update(sp.projectId + ":" + b.judgeUserId).digest("hex");
            return hashA.localeCompare(hashB);
        });

        const selected = eligibleJudges.slice(0, R);
        if (selected.length < R) {
            return { diagnostic: { status: "INFEASIBLE", reason: `Greedy construction failed to find ${R} judges for ${sp.projectId} (conflicts/capacity)` } };
        }

        for (const sj of selected) {
            assignments.push({ projectId: sp.projectId, judgeUserId: sj.judgeUserId });
            judgeLoads.set(sj.judgeUserId, judgeLoads.get(sj.judgeUserId)! + 1);
        }
    }

    if (J > 1 && R > 1) {
        let components = getComponents(stageJudges, stageProjects, assignments);
        let maxSwaps = 50; 
        let swapsDone = 0;

        while (components.length > 1 && swapsDone < maxSwaps) {
            let swapped = false;
            const compA = components[0];
            const compB = components[1];

            const edgesA = assignments.filter(a => compA.has(a.judgeUserId));
            const edgesB = assignments.filter(a => compB.has(a.judgeUserId));

            for (const eA of edgesA) {
                for (const eB of edgesB) {
                    const p1 = eA.projectId;
                    const j1 = eA.judgeUserId;
                    const p2 = eB.projectId;
                    const j2 = eB.judgeUserId;

                    if (conflicts.has(`${p1}:${j2}`) || conflicts.has(`${p2}:${j1}`)) continue;
                    
                    if (assignments.some(a => a.projectId === p1 && a.judgeUserId === j2)) continue;
                    if (assignments.some(a => a.projectId === p2 && a.judgeUserId === j1)) continue;

                    eA.judgeUserId = j2;
                    eB.judgeUserId = j1;
                    swapped = true;
                    break;
                }
                if (swapped) break;
            }

            if (!swapped) {
                return { diagnostic: { status: "CONSTRUCTION_FAILED", reason: "Overlap graph is disconnected and could not be repaired." } };
            }

            swapsDone++;
            components = getComponents(stageJudges, stageProjects, assignments);
        }

        if (components.length > 1) {
            return { diagnostic: { status: "CONSTRUCTION_FAILED", reason: "Overlap graph is still disconnected after maximum repair swaps." } };
        }
    }

    // Recompute loads after swaps just to be safe
    for (const sj of stageJudges) judgeLoads.set(sj.judgeUserId, 0);
    for (const a of assignments) judgeLoads.set(a.judgeUserId, judgeLoads.get(a.judgeUserId)! + 1);

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
        await tx.stageProject.deleteMany({ where: { stageId } });

        for (const sj of preview.stageJudges!) {
            await tx.stageJudge.upsert({
                where: { stageId_judgeUserId: { stageId, judgeUserId: sj.judgeUserId } },
                update: { isActive: true },
                create: { stageId, judgeUserId: sj.judgeUserId, isActive: true }
            });
        }
        
        // Mark others inactive (optional, but good for cleanliness)
        const activeUserIds = preview.stageJudges!.map((sj: any) => sj.judgeUserId);
        await tx.stageJudge.updateMany({
            where: { stageId, judgeUserId: { notIn: activeUserIds } },
            data: { isActive: false }
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
            status: AssignmentStatus.PENDING
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
