import { prisma } from "@/lib/db";
import * as crypto from "crypto";

export function calculateWLS(reviews: { projectId: string, judgeId: string, rawScore: number }[], judges: string[], projects: string[]) {
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

    let status = isConnected ? "CALIBRATED" : "DISCONNECTED_FALLBACK";
    
    // Initialize Biases and Means
    const b = new Map<string, number>();
    for (const j of judges) b.set(j, 0);

    const mu = new Map<string, number>();
    const rawMu = new Map<string, number>();
    
    // Baseline raw means
    for (const p of projects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        const mean = pRevs.length > 0 ? pRevs.reduce((sum, r) => sum + r.rawScore, 0) / pRevs.length : 0;
        rawMu.set(p, mean);
        mu.set(p, mean);
    }

    if (isConnected && judges.length > 1) {
        // Alternating minimization
        const MAX_ITER = 100;
        const EPSILON = 1e-6;
        for (let iter = 0; iter < MAX_ITER; iter++) {
            let maxChange = 0;

            // Update mu
            for (const p of projects) {
                const pRevs = reviews.filter(r => r.projectId === p);
                if (pRevs.length === 0) continue;
                const newMu = pRevs.reduce((sum, r) => sum + (r.rawScore - b.get(r.judgeId)!), 0) / pRevs.length;
                mu.set(p, newMu);
            }

            // Update b
            let sumB = 0;
            const newB = new Map<string, number>();
            for (const j of judges) {
                const jRevs = reviews.filter(r => r.judgeId === j);
                if (jRevs.length === 0) {
                    newB.set(j, 0);
                    continue;
                }
                const bj = jRevs.reduce((sum, r) => sum + (r.rawScore - mu.get(r.projectId)!), 0) / jRevs.length;
                newB.set(j, bj);
                sumB += bj;
            }

            // Center biases
            const meanB = sumB / judges.length;
            for (const j of judges) {
                const centered = newB.get(j)! - meanB;
                const change = Math.abs(centered - b.get(j)!);
                if (change > maxChange) maxChange = change;
                b.set(j, centered);
            }

            if (maxChange < EPSILON) break;
        }
    }

    // Results Generation
    const results = [];
    for (const p of projects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        const m = pRevs.length;
        const rm = rawMu.get(p)!;
        let nm = mu.get(p)!;
        
        // "score clamping only after aggregation"
        if (nm > 100) nm = 100;
        if (nm < 0) nm = 0;
        
        // SD on calibrated scores
        let sd = null;
        if (m > 1) {
            const variance = pRevs.reduce((sum, r) => {
                const calibratedScore = r.rawScore - b.get(r.judgeId)!;
                return sum + Math.pow(calibratedScore - nm, 2);
            }, 0) / (m - 1);
            sd = Math.sqrt(variance);
        }

        results.push({
            projectId: p,
            reviewCount: m,
            rawMean: rm,
            normalizedMean: nm,
            sd
        });
    }

    // Sort for ranking (descending normalizedMean, tie-break rawMean, tie-break projectId)
    results.sort((x, y) => {
        if (Math.abs(x.normalizedMean - y.normalizedMean) > 1e-9) return y.normalizedMean - x.normalizedMean;
        if (Math.abs(x.rawMean - y.rawMean) > 1e-9) return y.rawMean - x.rawMean;
        return x.projectId.localeCompare(y.projectId);
    });

    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
        (results[i] as any).rank = currentRank++;
        (results[i] as any).displayedMean = parseFloat(results[i].normalizedMean.toFixed(2));
    }

    const calibrations = judges.map(j => ({
        judgeUserId: j,
        offset: b.get(j)!,
        reviewCount: reviews.filter(r => r.judgeId === j).length
    }));

    return { status, isConnected, results, calibrations };
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
    
    const calc = calculateWLS(reviews, judges, projects);

    // Input Hash
    const inputHashStr = JSON.stringify(reviews.sort((a,b) => a.projectId.localeCompare(b.projectId) || a.judgeId.localeCompare(b.judgeId)));
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

        const runId = `calc_${crypto.randomBytes(8).toString('hex')}`;
        
        const run = await tx.calculationRun.create({
            data: {
                id: runId,
                stageId,
                configHash,
                inputHash,
                method: preview.status,
                implVersion: "v1_wls",
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
                tieKey: null
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
