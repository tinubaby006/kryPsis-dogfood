import { prisma } from "@/lib/db";
import * as crypto from "crypto";

export function pairOverlapWLS_v3(
    reviews: { projectId: string, judgeId: string, rawScore: number }[],
    judges: string[],
    projects: string[],
    stageProjects: { projectId: string }[],
    R: number,
    origin: string
) {
    if (stageProjects.length === 0 || reviews.length === 0) {
        return { status: "INCOMPLETE_EVIDENCE", reason: "No evidence or no projects", isConnected: false, results: [], calibrations: [] };
    }

    const reviewCounts = new Map<string, number>();
    for (const sp of stageProjects) reviewCounts.set(sp.projectId, 0);
    for (const r of reviews) {
        if (reviewCounts.has(r.projectId)) {
            reviewCounts.set(r.projectId, reviewCounts.get(r.projectId)! + 1);
        } else {
            reviewCounts.set(r.projectId, 1);
        }
    }

    if (origin === 'LIVE') {
        for (const [pId, m] of reviewCounts.entries()) {
            if (m !== R) {
                return { status: "INCOMPLETE_EVIDENCE", reason: `Project ${pId} has ${m} reviews, exactly ${R} required for LIVE.`, isConnected: false, results: [], calibrations: [] };
            }
        }
    }
    
    // Sort canonical inputs
    const sortedJudges = [...judges].sort();
    const sortedProjects = [...projects].sort();

    let isConnected = true;
    const adj = new Map<string, Set<string>>();
    for (const j of sortedJudges) adj.set(j, new Set());

    // Build overlap counts and D_jk
    const sharedCounts = new Map<string, number>(); // key: "j<k", value: n
    const diffSums = new Map<string, number>();     // key: "j<k", value: sum(score_j - score_k)

    for (const p of sortedProjects) {
        const pRevs = reviews.filter(r => r.projectId === p).sort((a, b) => a.judgeId.localeCompare(b.judgeId));
        for (let i = 0; i < pRevs.length; i++) {
            for (let j = i + 1; j < pRevs.length; j++) {
                const j1 = pRevs[i].judgeId;
                const j2 = pRevs[j].judgeId;
                // j1 < j2 always true due to sort
                adj.get(j1)!.add(j2);
                adj.get(j2)!.add(j1);
                
                const key = `${j1}:${j2}`;
                sharedCounts.set(key, (sharedCounts.get(key) || 0) + 1);
                diffSums.set(key, (diffSums.get(key) || 0) + (pRevs[i].rawScore - pRevs[j].rawScore));
            }
        }
    }

    if (sortedJudges.length > 0) {
        const visited = new Set<string>();
        const queue = [sortedJudges[0]];
        visited.add(sortedJudges[0]);
        while (queue.length > 0) {
            const curr = queue.shift()!;
            for (const n of adj.get(curr)!) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }
        isConnected = visited.size === sortedJudges.length;
    }

    if (!isConnected && sortedJudges.length > 1) {
        return { status: "UNSUPPORTED", reason: "Disconnected multi-judge panel.", isConnected: false, results: [], calibrations: [] };
    }

    let b = new Array(sortedJudges.length).fill(0);

    if (sortedJudges.length > 1) {
        const n = sortedJudges.length;
        const L = Array.from({ length: n }, () => new Array(n).fill(0));
        const q = new Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            let sumN = 0;
            let q_i = 0;
            for (let k = 0; k < n; k++) {
                if (i !== k) {
                    const j1 = sortedJudges[Math.min(i, k)];
                    const j2 = sortedJudges[Math.max(i, k)];
                    const key = `${j1}:${j2}`;
                    const count = sharedCounts.get(key) || 0;
                    if (count > 0) {
                        const sumDiff = diffSums.get(key)!;
                        const D = sumDiff / count; // average difference
                        const D_ik = i < k ? D : -D;
                        sumN += count;
                        L[i][k] = -count;
                        q_i += count * D_ik;
                    }
                }
            }
            L[i][i] = sumN;
            q[i] = q_i;
        }

        // Solve [L 1; 1^T 0] [b; lambda] = [q; 0]
        const size = n + 1;
        const M = [];
        for (let i = 0; i < n; i++) {
            M.push([...L[i], 1, q[i]]);
        }
        const bottom = Array(n).fill(1);
        bottom.push(0, 0);
        M.push(bottom);

        // Gaussian elimination with partial pivoting
        for (let i = 0; i < size; i++) {
            let maxRow = i;
            for (let j = i + 1; j < size; j++) {
                if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) {
                    maxRow = j;
                }
            }
            
            const temp: number[] = M[i];
            M[i] = M[maxRow];
            M[maxRow] = temp;

            if (Math.abs(M[i][i]) < 1e-12) {
                return { status: "NUMERICAL_FAILURE", reason: "Singular matrix", isConnected, results: [], calibrations: [] };
            }

            for (let j = i + 1; j < size; j++) {
                const factor = M[j][i] / M[i][i];
                for (let k = i; k <= size; k++) {
                    M[j][k] -= factor * M[i][k];
                }
            }
            
            // Check for non-finite values in matrix
            for (let k = i; k <= size; k++) {
                if (!Number.isFinite(M[i][k])) {
                    return { status: "NUMERICAL_FAILURE", reason: "Non-finite values during solve", isConnected, results: [], calibrations: [] };
                }
            }
        }

        const res = Array(size).fill(0);
        for (let i = size - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < size; j++) {
                sum += M[i][j] * res[j];
            }
            res[i] = (M[i][size] - sum) / M[i][i];
            if (!Number.isFinite(res[i])) {
                return { status: "NUMERICAL_FAILURE", reason: "Non-finite result", isConnected, results: [], calibrations: [] };
            }
        }
        
        // Residual check
        let maxResid = 0;
        for (let i = 0; i < n; i++) {
            let rowSum = 0;
            for (let j = 0; j < n; j++) {
                rowSum += L[i][j] * res[j];
            }
            rowSum += res[n]; // lambda
            maxResid = Math.max(maxResid, Math.abs(rowSum - q[i]));
        }
        if (maxResid > 1e-5) {
            return { status: "NUMERICAL_FAILURE", reason: `High residual: ${maxResid}`, isConnected, results: [], calibrations: [] };
        }

        b = res.slice(0, n);
    }

    const results = [];
    for (const p of sortedProjects) {
        const pRevs = reviews.filter(r => r.projectId === p);
        const m = pRevs.length;
        if (m === 0) continue; // For fixture with unknown coverage, maybe skipped
        
        const rawMean = pRevs.reduce((sum, r) => sum + r.rawScore, 0) / m;
        
        let sumNorm = 0;
        for (const r of pRevs) {
            const jIdx = sortedJudges.indexOf(r.judgeId);
            sumNorm += (r.rawScore - b[jIdx]);
        }
        const unclampedNm = sumNorm / m;
        
        let sd = null;
        if (m > 1) {
            let varianceSum = 0;
            for (const r of pRevs) {
                const jIdx = sortedJudges.indexOf(r.judgeId);
                const calibScore = r.rawScore - b[jIdx];
                varianceSum += Math.pow(calibScore - unclampedNm, 2);
            }
            sd = Math.sqrt(varianceSum / (m - 1));
            // Ensure exactly zero if very small
            if (sd < 1e-12) sd = 0;
        }

        results.push({
            projectId: p,
            reviewCount: m,
            rawMean: rawMean,
            normalizedMean: unclampedNm, 
            displayedMean: Math.max(0, Math.min(100, unclampedNm)),
            sd
        });
    }

    results.sort((x, y) => {
        if (Math.abs(x.normalizedMean - y.normalizedMean) > 1e-9) return y.normalizedMean - x.normalizedMean;
        
        // EXACT TIE
        const hx = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", "EVENT", "STAGE", x.projectId])).digest("hex");
        const hy = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", "EVENT", "STAGE", y.projectId])).digest("hex");
        return hx.localeCompare(hy);
    });

    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
        (results[i] as any).rank = currentRank++;
        (results[i] as any).displayedMean = parseFloat(results[i].displayedMean.toFixed(2));
    }

    const calibrations = sortedJudges.map((j, i) => ({
        judgeUserId: j,
        offset: b[i],
        reviewCount: reviews.filter(r => r.judgeId === j).length
    }));
    
    // Status can be SINGLE_JUDGE_UNCALIBRATED
    let status = "SUCCESS";
    if (sortedJudges.length === 1) status = "SINGLE_JUDGE_UNCALIBRATED";

    return { status, isConnected, results, calibrations };
}

export async function generateCalculationPreview(stageId: string) {
    const stage = await prisma.judgingStage.findUnique({ where: { id: stageId }, include: { event: true } });
    if (!stage) throw new Error("Stage not found");

    const rubric = await prisma.rubricVersion.findFirst({
        where: { stageId },
        include: { criteria: true },
        orderBy: { createdAt: 'desc' }
    });

    if (!rubric) throw new Error("No rubric found");

    const expectedCriteria = rubric.criteria.map(c => c.id).sort();

    // Find ONLY COMPLETED assignments
    const assignments = await prisma.rubricAssignment.findMany({
        where: { stageId, status: "COMPLETED" },
        include: { finalReview: { include: { scores: true } } }
    });
    
    // Check pending assignments if LIVE
    if (stage.origin === 'LIVE') {
        const pendingCount = await prisma.rubricAssignment.count({
            where: { stageId, status: "PENDING" }
        });
        if (pendingCount > 0) {
            throw new Error(`Cannot calculate: Stage has ${pendingCount} active pending assignments.`);
        }
    }

    const stageProjects = await prisma.stageProject.findMany({
        where: { stageId },
        select: { projectId: true }
    });

    const reviews: { projectId: string, judgeId: string, rawScore: number }[] = [];
    const validFinals = [];
    
    for (const asn of assignments) {
        if (!asn.finalReview) {
            if (stage.origin === 'LIVE') throw new Error(`Assignment ${asn.id} is COMPLETED but missing finalReview.`);
            continue;
        }
        
        const reviewCriteria = asn.finalReview.scores.map(s => s.criterionId).sort();
        if (JSON.stringify(reviewCriteria) !== JSON.stringify(expectedCriteria)) {
            throw new Error(`Review ${asn.finalReview.id} does not exactly match rubric criteria.`);
        }

        let rawScore = 0;
        let weightSum = 0;
        for (const crit of rubric.criteria) {
            const sc = asn.finalReview.scores.find(s => s.criterionId === crit.id);
            if (!sc) throw new Error("Missing score");
            if (sc.value < 0 || sc.value > crit.maxScore) throw new Error(`Value ${sc.value} outside bounds 0-${crit.maxScore}`);
            
            rawScore += (crit.weightBasisPts / 10000) * (sc.value / crit.maxScore);
            weightSum += crit.weightBasisPts;
        }
        if (weightSum !== 10000) throw new Error("Rubric weights do not sum to 10000");
        
        rawScore = rawScore * 100;
        if (!Number.isFinite(rawScore)) throw new Error("Non-finite raw score");
        
        reviews.push({
            projectId: asn.projectId,
            judgeId: asn.judgeUserId,
            rawScore
        });
        
        validFinals.push({
            assignmentId: asn.id,
            judgeUserId: asn.judgeUserId,
            projectId: asn.projectId,
            scores: asn.finalReview.scores.map(s => ({ c: s.criterionId, v: s.value })).sort((a,b) => a.c.localeCompare(b.c))
        });
    }

    const projects = Array.from(new Set(reviews.map(r => r.projectId)));
    const judges = Array.from(new Set(reviews.map(r => r.judgeId)));
    
    const calc = pairOverlapWLS_v3(reviews, judges, projects, stageProjects, stage.requiredReviews, stage.origin);
    
    // Fix ties with actual event/stage IDs
    if (calc.results && calc.results.length > 0) {
        calc.results.sort((x, y) => {
            if (Math.abs(x.normalizedMean - y.normalizedMean) > 1e-9) return y.normalizedMean - x.normalizedMean;
            
            const hx = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, x.projectId])).digest("hex");
            const hy = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, y.projectId])).digest("hex");
            return hx.localeCompare(hy);
        });

        let currentRank = 1;
        for (let i = 0; i < calc.results.length; i++) {
            (calc.results[i] as any).rank = currentRank++;
            (calc.results[i] as any).tieKey = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, calc.results[i].projectId])).digest("hex");
        }
    }

    // Input Hash - Canonical JSON stringification
    // Canonical inputs must use stable sorted arrays and deterministic JSON encoding
    const canonicalInput = {
        origin: stage.origin,
        R: stage.requiredReviews,
        enrolledProjects: stageProjects.map(sp => sp.projectId).sort(),
        rubricId: rubric.id,
        reviews: validFinals.sort((a, b) => a.assignmentId.localeCompare(b.assignmentId))
    };
    
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(canonicalInput)).digest("hex");
    const configHash = crypto.createHash("sha256").update(JSON.stringify({ 
        method: "PAIR_OVERLAP_WLS", 
        version: "pair_overlap_wls_v3",
        rubric: rubric.id 
    })).digest("hex");

    return {
        status: calc.status,
        reason: (calc as any).reason,
        results: calc.results,
        calibrations: calc.calibrations,
        inputHash,
        configHash,
        diagnostics: {
            totalReviews: reviews.length,
            connected: calc.isConnected,
            judgesCount: judges.length,
            projectsCount: projects.length,
            completeness: stage.origin === 'LIVE' ? 'EXACT' : 'UNKNOWN'
        }
    };
}

export async function commitCalculationRun(stageId: string, inputHash: string, configHash: string) {
    return await prisma.$transaction(async (tx) => {
        // Lock Event and Stage
        const stageInfo = await tx.judgingStage.findUnique({ where: { id: stageId } });
        if (!stageInfo) throw new Error("Stage not found");
        
        await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${stageInfo.eventId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "JudgingStage" WHERE id = ${stageId} FOR UPDATE`;
        
        // Lock Assignments
        await tx.$queryRaw`SELECT id FROM "RubricAssignment" WHERE "stageId" = ${stageId} ORDER BY id ASC FOR UPDATE`;
        
        const stage = await tx.judgingStage.findUnique({ where: { id: stageId } });
        if (!stage) throw new Error("Stage not found");
        
        if (stage.state !== "CLOSED" && stage.state !== "CALCULATING" && stage.state !== "CALCULATED") {
            throw new Error(`Cannot calculate in state ${stage.state}`);
        }

        // We can't easily call generateCalculationPreview inside tx because it uses standard prisma. 
        // We need to inject tx to generateCalculationPreview or re-implement it inside tx.
        // Actually, let's implement a tx-aware preview here.
        
        const rubric = await tx.rubricVersion.findFirst({
            where: { stageId },
            include: { criteria: true },
            orderBy: { createdAt: 'desc' }
        });
        if (!rubric) throw new Error("No rubric found");
        const expectedCriteria = rubric.criteria.map(c => c.id).sort();

        const assignments = await tx.rubricAssignment.findMany({
            where: { stageId, status: "COMPLETED" },
            include: { finalReview: { include: { scores: true } } },
            orderBy: { id: 'asc' }
        });

        if (stage.origin === 'LIVE') {
            const pendingCount = await tx.rubricAssignment.count({
                where: { stageId, status: "PENDING" }
            });
            if (pendingCount > 0) throw new Error(`Cannot calculate: Stage has ${pendingCount} active pending assignments.`);
        }

        const stageProjects = await tx.stageProject.findMany({
            where: { stageId },
            select: { projectId: true }
        });

        const reviews = [];
        const validFinals = [];
        for (const asn of assignments) {
            if (!asn.finalReview) {
                if (stage.origin === 'LIVE') throw new Error(`Assignment ${asn.id} is COMPLETED but missing finalReview.`);
                continue;
            }
            const reviewCriteria = asn.finalReview.scores.map(s => s.criterionId).sort();
            if (JSON.stringify(reviewCriteria) !== JSON.stringify(expectedCriteria)) throw new Error(`Review ${asn.finalReview.id} does not exactly match rubric criteria.`);

            let rawScore = 0;
            let weightSum = 0;
            for (const crit of rubric.criteria) {
                const sc = asn.finalReview.scores.find(s => s.criterionId === crit.id);
                if (!sc) throw new Error("Missing score");
                if (sc.value < 0 || sc.value > crit.maxScore) throw new Error(`Value ${sc.value} outside bounds 0-${crit.maxScore}`);
                
                rawScore += (crit.weightBasisPts / 10000) * (sc.value / crit.maxScore);
                weightSum += crit.weightBasisPts;
            }
            if (weightSum !== 10000) throw new Error("Rubric weights do not sum to 10000");
            rawScore = rawScore * 100;
            if (!Number.isFinite(rawScore)) throw new Error("Non-finite raw score");
            
            reviews.push({ projectId: asn.projectId, judgeId: asn.judgeUserId, rawScore });
            validFinals.push({
                assignmentId: asn.id,
                judgeUserId: asn.judgeUserId,
                projectId: asn.projectId,
                scores: asn.finalReview.scores.map(s => ({ c: s.criterionId, v: s.value })).sort((a,b) => a.c.localeCompare(b.c))
            });
        }

        const projects = Array.from(new Set(reviews.map(r => r.projectId)));
        const judges = Array.from(new Set(reviews.map(r => r.judgeId)));
        
        const calc = pairOverlapWLS_v3(reviews, judges, projects, stageProjects, stage.requiredReviews, stage.origin);
        
        if (calc.results && calc.results.length > 0) {
            calc.results.sort((x, y) => {
                if (Math.abs(x.normalizedMean - y.normalizedMean) > 1e-9) return y.normalizedMean - x.normalizedMean;
                const hx = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, x.projectId])).digest("hex");
                const hy = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, y.projectId])).digest("hex");
                return hx.localeCompare(hy);
            });
            let currentRank = 1;
            for (let i = 0; i < calc.results.length; i++) {
                (calc.results[i] as any).rank = currentRank++;
                (calc.results[i] as any).tieKey = crypto.createHash("sha256").update(JSON.stringify(["tie-v3", stage.eventId, stage.id, calc.results[i].projectId])).digest("hex");
            }
        }

        const canonicalInput = {
            origin: stage.origin,
            R: stage.requiredReviews,
            enrolledProjects: stageProjects.map(sp => sp.projectId).sort(),
            rubricId: rubric.id,
            reviews: validFinals.sort((a, b) => a.assignmentId.localeCompare(b.assignmentId))
        };
        const currentInputHash = crypto.createHash("sha256").update(JSON.stringify(canonicalInput)).digest("hex");
        const currentConfigHash = crypto.createHash("sha256").update(JSON.stringify({ 
            method: "PAIR_OVERLAP_WLS", 
            version: "pair_overlap_wls_v3",
            rubric: rubric.id 
        })).digest("hex");

        if (currentInputHash !== inputHash || currentConfigHash !== configHash) {
            throw new Error("409 CONFLICT: Stale calculation data. Evidence or configuration has changed.");
        }

        const existingRun = await tx.calculationRun.findFirst({
            where: { stageId, inputHash, configHash, status: "SUCCESS" }
        });

        if (existingRun) {
            return { success: true, runId: existingRun.id, message: "Idempotent return" };
        }

        if (calc.status !== "SUCCESS" && calc.status !== "SINGLE_JUDGE_UNCALIBRATED") {
            throw new Error(`Cannot commit: ${calc.status} (${(calc as any).reason || ''})`);
        }

        const runId = `calc_${crypto.randomBytes(8).toString('hex')}`;
        
        const diagnostics = {
            totalReviews: reviews.length,
            connected: calc.isConnected,
            judgesCount: judges.length,
            projectsCount: projects.length,
            completeness: stage.origin === 'LIVE' ? 'EXACT' : 'UNKNOWN'
        };

        const run = await tx.calculationRun.create({
            data: {
                id: runId,
                stageId,
                configHash,
                inputHash,
                method: "PAIR_OVERLAP_WLS",
                implVersion: "pair_overlap_wls_v3",
                status: calc.status,
                finishedAt: new Date(),
                diagnostics
            }
        });

        await tx.projectResult.createMany({
            data: calc.results.map(r => ({
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
            data: calc.calibrations.map(c => ({
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
