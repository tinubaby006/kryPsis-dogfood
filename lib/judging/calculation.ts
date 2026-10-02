import { prisma } from "@/lib/db";
import * as crypto from "crypto";

export function calculateWeightedWLS(reviews: { projectId: string, judgeId: string, rawScore: number }[], judges: string[], projects: string[], stageProjects: { projectId: string }[], R: number) {
    // 1. Strict Evidence Completeness Check
    for (const sp of stageProjects) {
        const m = reviews.filter(r => r.projectId === sp.projectId).length;
        if (m < R) {
            return { status: "INCOMPLETE_EVIDENCE", reason: `Project ${sp.projectId} has ${m} reviews, requires ${R}. Missing review is never zero.`, isConnected: false, results: [], calibrations: [] };
        }
    }

    let isConnected = true;
    const adj = new Map<string, Set<string>>();
    for (const j of judges) adj.set(j, new Set());

    // Build judge overlap graph
    for (const p of projects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        for (let i = 0; i < pRevs.length; i++) {
            for (let j = i + 1; j < pRevs.length; j++) {
                adj.get(pRevs[i].judgeId)!.add(pRevs[j].judgeId);
                adj.get(pRevs[j].judgeId)!.add(pRevs[i].judgeId);
            }
        }
    }

    if (judges.length > 0) {
        const visited = new Set<string>();
        const queue = [judges[0]];
        visited.add(judges[0]);
        while (queue.length > 0) {
            const curr = queue.shift()!;
            for (const n of adj.get(curr)!) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }
        isConnected = visited.size === judges.length;
    }

    // "Disconnected multi-judge calibration returns unsupported, not a publishable raw-mean fallback."
    if (!isConnected && judges.length > 1) {
        return { status: "UNSUPPORTED", reason: "Disconnected multi-judge panel.", isConnected: false, results: [], calibrations: [] };
    }

    // Weighted WLS Setup
    const A = new Map<string, Map<string, number>>();
    const v = new Map<string, number>();
    const b = new Map<string, number>();
    for (const j of judges) {
        A.set(j, new Map());
        v.set(j, 0);
        b.set(j, 0);
    }

    const rawMu = new Map<string, number>();
    for (const p of projects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        const m = pRevs.length;
        if (m === 0) continue;
        const mean = pRevs.reduce((sum, r) => sum + r.rawScore, 0) / m;
        rawMu.set(p, mean);
        
        for (const r1 of pRevs) {
            v.set(r1.judgeId, v.get(r1.judgeId)! + (r1.rawScore - mean));
            
            const a_jj = A.get(r1.judgeId)!.get(r1.judgeId) || 0;
            A.get(r1.judgeId)!.set(r1.judgeId, a_jj + (1 - 1/m));
            
            for (const r2 of pRevs) {
                if (r1.judgeId !== r2.judgeId) {
                    const a_jk = A.get(r1.judgeId)!.get(r2.judgeId) || 0;
                    A.get(r1.judgeId)!.set(r2.judgeId, a_jk - 1/m);
                }
            }
        }
    }

    if (isConnected && judges.length > 1) {
        const MAX_ITER = 1000;
        const EPSILON = 1e-7;
        for (let iter = 0; iter < MAX_ITER; iter++) {
            let maxChange = 0;
            let sumB = 0;
            for (const j of judges) {
                let sumAkBk = 0;
                for (const [k, a_jk] of A.get(j)!.entries()) {
                    if (k !== j) {
                        sumAkBk += a_jk * b.get(k)!;
                    }
                }
                const a_jj = A.get(j)!.get(j) || 0;
                if (a_jj > 0) {
                    const newBj = (v.get(j)! - sumAkBk) / a_jj;
                    const change = Math.abs(newBj - b.get(j)!);
                    if (change > maxChange) maxChange = change;
                    b.set(j, newBj);
                }
                sumB += b.get(j)!;
            }
            const meanB = sumB / judges.length;
            for (const j of judges) {
                b.set(j, b.get(j)! - meanB);
            }
            if (maxChange < EPSILON) break;
        }
    }

    // Results Generation
    const results = [];
    for (const p of projects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        const m = pRevs.length;
        if (m === 0) continue;
        
        const rm = rawMu.get(p)!;
        const unclampedNm = pRevs.reduce((sum, r) => sum + (r.rawScore - b.get(r.judgeId)!), 0) / m;
        
        let sd = null;
        if (m > 1) {
            const variance = pRevs.reduce((sum, r) => {
                const calibratedScore = r.rawScore - b.get(r.judgeId)!;
                return sum + Math.pow(calibratedScore - unclampedNm, 2);
            }, 0) / (m - 1);
            sd = Math.sqrt(variance);
        }

        results.push({
            projectId: p,
            reviewCount: m,
            rawMean: rm,
            normalizedMean: unclampedNm, 
            displayedMean: Math.max(0, Math.min(100, unclampedNm)),
            sd
        });
    }

    // Versioned deterministic ties
    results.sort((x, y) => {
        if (Math.abs(x.normalizedMean - y.normalizedMean) > 1e-9) return y.normalizedMean - x.normalizedMean;
        if (Math.abs(x.rawMean - y.rawMean) > 1e-9) return y.rawMean - x.rawMean;
        
        const hx = crypto.createHash("sha256").update(x.projectId + "tie").digest("hex");
        const hy = crypto.createHash("sha256").update(y.projectId + "tie").digest("hex");
        return hx.localeCompare(hy);
    });

    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
        (results[i] as any).rank = currentRank++;
        (results[i] as any).displayedMean = parseFloat(results[i].displayedMean.toFixed(2));
        (results[i] as any).tieKey = crypto.createHash("sha256").update(results[i].projectId + "tie").digest("hex");
    }

    const calibrations = judges.map(j => ({
        judgeUserId: j,
        offset: b.get(j)!,
        reviewCount: reviews.filter(r => r.judgeId === j).length
    }));

    return { status: "SUCCESS", isConnected, results, calibrations };
}

export async function generateCalculationPreview(stageId: string) {
    const stage = await prisma.judgingStage.findUnique({ where: { id: stageId } });
    if (!stage) throw new Error("Stage not found");

    const rubric = await prisma.rubricVersion.findFirst({
        where: { stageId },
        include: { criteria: true },
        orderBy: { createdAt: 'desc' }
    });

    if (!rubric) throw new Error("No rubric found");

    const criteriaMap = new Map();
    for (const c of rubric.criteria) criteriaMap.set(c.id, c);

    const assignments = await prisma.rubricAssignment.findMany({
        where: { stageId, status: "COMPLETED" },
        include: { finalReview: { include: { scores: true } } }
    });

    const stageProjects = await prisma.stageProject.findMany({
        where: { stageId },
        select: { projectId: true }
    });

    // Compute Raw Scores
    const reviews: { projectId: string, judgeId: string, rawScore: number }[] = [];
    
    for (const asn of assignments) {
        if (!asn.finalReview) continue;
        let weightedBasisSum = 0;
        for (const sc of asn.finalReview.scores) {
            const crit = criteriaMap.get(sc.criterionId);
            if (!crit || crit.maxScore === 0) continue;
            const pct = sc.value / crit.maxScore;
            weightedBasisSum += pct * crit.weightBasisPts;
        }
        const rawScore = weightedBasisSum / 100;
        reviews.push({
            projectId: asn.projectId,
            judgeId: asn.judgeUserId,
            rawScore
        });
    }

    const projects = Array.from(new Set(reviews.map(r => r.projectId)));
    const judges = Array.from(new Set(reviews.map(r => r.judgeId)));
    
    const calc = calculateWeightedWLS(reviews, judges, projects, stageProjects, stage.requiredReviews);

    // Input Hash
    // Canonical JSON stringification for hashing evidence
    const inputHashStr = JSON.stringify({
        reviews: reviews.sort((a,b) => a.projectId.localeCompare(b.projectId) || a.judgeId.localeCompare(b.judgeId)),
        stageProjects: stageProjects.map(sp => sp.projectId).sort()
    });
    const inputHash = crypto.createHash("sha256").update(inputHashStr).digest("hex");
    const configHash = crypto.createHash("sha256").update(rubric.id).digest("hex");

    return {
        status: calc.status,
        results: calc.results,
        calibrations: calc.calibrations,
        inputHash,
        configHash,
        diagnostics: {
            totalReviews: reviews.length,
            connected: calc.isConnected,
            judgesCount: judges.length,
            projectsCount: projects.length
        }
    };
}

export async function commitCalculationRun(stageId: string, inputHash: string, configHash: string) {
    return await prisma.$transaction(async (tx) => {
        const stage = await tx.judgingStage.findUnique({ where: { id: stageId } });
        if (!stage) throw new Error("Stage not found");
        
        if (stage.state !== "CLOSED" && stage.state !== "CALCULATING" && stage.state !== "CALCULATED") {
            throw new Error(`Cannot calculate in state ${stage.state}`);
        }

        const preview = await generateCalculationPreview(stageId);
        if (preview.inputHash !== inputHash || preview.configHash !== configHash) {
            throw new Error("409 CONFLICT: Stale calculation data. Evidence or configuration has changed.");
        }

        const existingRun = await tx.calculationRun.findFirst({
            where: { stageId, inputHash, configHash }
        });

        if (existingRun && existingRun.status === "SUCCESS") {
            return { success: true, runId: existingRun.id, message: "Idempotent return" };
        }

        if (preview.status !== "SUCCESS") {
            throw new Error(`Cannot commit: ${preview.status} (${(preview as any).reason || ''})`);
        }

        const runId = `calc_${crypto.randomBytes(8).toString('hex')}`;
        
        const run = await tx.calculationRun.create({
            data: {
                id: runId,
                stageId,
                configHash,
                inputHash,
                method: preview.status,
                implVersion: "v2_weighted_constrained_wls",
                status: "SUCCESS",
                finishedAt: new Date(),
                diagnostics: preview.diagnostics
            }
        });

        await tx.projectResult.createMany({
            data: preview.results.map(r => ({
                id: `res_${crypto.randomBytes(8).toString('hex')}`,
                calculationRunId: run.id,
                projectId: r.projectId,
                reviewCount: r.reviewCount,
                rawMean: r.rawMean,
                normalizedMean: r.normalizedMean,
                displayedMean: (r as any).displayedMean,
                sd: r.sd,
                rank: (r as any).rank,
                tieKey: (r as any).tieKey
            }))
        });

        await tx.judgeCalibration.createMany({
            data: preview.calibrations.map(c => ({
                id: `cal_${crypto.randomBytes(8).toString('hex')}`,
                calculationRunId: run.id,
                judgeUserId: c.judgeUserId,
                offset: c.offset,
                reviewCount: c.reviewCount
            }))
        });

        await tx.judgingStage.update({
            where: { id: stageId },
            data: { state: "CALCULATED" }
        });

        return { success: true, runId: run.id };
    });
}
