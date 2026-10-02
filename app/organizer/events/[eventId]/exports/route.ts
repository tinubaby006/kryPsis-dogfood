import { prisma } from "@/lib/db";
import { requireEventOrganizer, PermissionError } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { generateCSV } from "@/lib/csv";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const stageId = url.searchParams.get("stageId");

    try {
        await requireEventOrganizer(eventId);
    } catch (e: any) {
        if (e instanceof PermissionError) return new NextResponse(e.message, { status: e.statusCode });
        return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!stageId && type !== "historical_reviews") {
        return new NextResponse("Missing stageId", { status: 400 });
    }

    let csvStr = "";
    let filename = `export_${type}_${stageId || eventId}.csv`;

    if (type === "historical_reviews") {
        const reviews = await prisma.review.findMany({
            where: { eventId, source: "FIXTURE" },
            include: { 
                scores: { include: { criterion: true }, orderBy: { criterionId: "asc" } },
                project: true,
                judge: true
            },
            orderBy: [{ projectId: "asc" }, { judgeUserId: "asc" }, { id: "asc" }]
        });
        
        type HistRow = any;
        const rows: HistRow[] = reviews.flatMap(review => review.scores.map(score => ({
            eventId,
            reviewId: review.id,
            projectId: review.projectId,
            projectTitle: review.project.title,
            judgeUserId: review.judgeUserId,
            judgeName: review.judge.name || "",
            judgeEmail: review.judge.email || "",
            criterionKey: score.criterion.key,
            criterionName: score.criterion.label,
            originalValue: score.value,
            comment: review.comment || "",
            source: review.source,
            sourceKey: "",
            importedAt: "",
            originalSubmittedAt: ""
        })));

        csvStr = generateCSV(rows, [
            { header: "Event ID", key: "eventId" },
            { header: "Review ID", key: "reviewId" },
            { header: "Project ID", key: "projectId" },
            { header: "Project Title", key: "projectTitle" },
            { header: "Judge User ID", key: "judgeUserId" },
            { header: "Judge Name", key: "judgeName" },
            { header: "Judge Email", key: "judgeEmail" },
            { header: "Criterion Key", key: "criterionKey" },
            { header: "Criterion Name", key: "criterionName" },
            { header: "Original Value", key: "originalValue" },
            { header: "Comment", key: "comment" },
            { header: "Source", key: "source" },
            { header: "Source Key", key: "sourceKey" },
            { header: "Imported At", key: "importedAt" },
            { header: "Original Submitted At", key: "originalSubmittedAt" }
        ]);
    } else {
        const stage = await prisma.judgingStage.findUnique({ where: { id: stageId!, eventId } });
        if (!stage) return new NextResponse("Stage not found", { status: 404 });

        if (type === "assignments") {
            const assignments = await prisma.rubricAssignment.findMany({
                where: { stageId: stageId! },
                include: { project: true, judge: true },
                orderBy: { createdAt: 'asc' }
            });
            csvStr = generateCSV(assignments, [
                { header: "Assignment ID", key: "id" },
                { header: "Project ID", key: "projectId" },
                { header: "Project Title", key: (r) => r.project.title },
                { header: "Judge User ID", key: "judgeUserId" },
                { header: "Judge Name", key: (r) => r.judge.name || "" },
                { header: "Judge Email", key: (r) => r.judge.email || "" },
                { header: "Status", key: "status" },
                { header: "Created At", key: (r) => r.createdAt.toISOString() }
            ]);
        } else if (type === "raw_reviews") {
            const assignments = await prisma.rubricAssignment.findMany({
                where: { stageId: stageId!, status: "COMPLETED" },
                include: { 
                    finalReview: { include: { scores: { include: { criterion: true } } } },
                    project: true,
                    judge: true
                }
            });
            const rows: any[] = [];
            for (const asn of assignments) {
                if (asn.finalReview) {
                    for (const sc of asn.finalReview.scores) {
                        rows.push({
                            assignmentId: asn.id,
                            projectId: asn.projectId,
                            projectTitle: asn.project.title,
                            judgeUserId: asn.judgeUserId,
                            judgeName: asn.judge.name || "",
                            criterionId: sc.criterionId,
                            criterionKey: sc.criterion.key,
                            score: sc.value,
                            weight: sc.criterion.weightBasisPts,
                            maxValue: sc.criterion.maxScore
                        });
                    }
                }
            }
            csvStr = generateCSV(rows, [
                { header: "Assignment ID", key: "assignmentId" },
                { header: "Project ID", key: "projectId" },
                { header: "Project Title", key: "projectTitle" },
                { header: "Judge User ID", key: "judgeUserId" },
                { header: "Judge Name", key: "judgeName" },
                { header: "Criterion ID", key: "criterionId" },
                { header: "Criterion Key", key: "criterionKey" },
                { header: "Score", key: "score" },
                { header: "Weight", key: "weight" },
                { header: "Max Value", key: "maxValue" }
            ]);
        } else if (type === "diagnostics") {
            const run = await prisma.calculationRun.findFirst({
                where: { stageId: stageId! },
                orderBy: { finishedAt: 'desc' },
                include: { calibrations: { include: { judge: true } } }
            });
            if (!run) return new NextResponse("No calculations found", { status: 409 });
            csvStr = generateCSV(run.calibrations, [
                { header: "Run ID", key: () => run.id },
                { header: "Judge User ID", key: "judgeUserId" },
                { header: "Judge Name", key: (r) => r.judge.name || "" },
                { header: "Review Count", key: "reviewCount" },
                { header: "Offset (Bias)", key: "offset" }
            ]);
        } else if (type === "results") {
            let run = null;
            let finality = "PROVISIONAL";
            if (stage.state === "FINALIZED") {
                const snapshot = await prisma.finalizationSnapshot.findUnique({
                    where: { stageId: stageId! }
                });
                if (snapshot) {
                    run = await prisma.calculationRun.findUnique({
                        where: { id: snapshot.calculationRunId },
                        include: { projectResults: { include: { project: true } } }
                    });
                    finality = "SNAPSHOT";
                }
            } else if (stage.origin === "FIXTURE") {
                run = await prisma.calculationRun.findFirst({
                    where: { stageId: stageId!, status: "SUCCESS" },
                    orderBy: { finishedAt: 'desc' },
                    include: { projectResults: { include: { project: true } } }
                });
                finality = "HISTORICAL_ANALYSIS";
            } else {
                run = await prisma.calculationRun.findFirst({
                    where: { stageId: stageId!, status: "SUCCESS" },
                    orderBy: { finishedAt: 'desc' },
                    include: { projectResults: { include: { project: true } } }
                });
            }
            
            if (!run) return new NextResponse("No valid calculation exists", { status: 409 });

            const sorted = run.projectResults.sort((a,b) => (a.rank||0) - (b.rank||0));
            csvStr = generateCSV(sorted, [
                { header: "Finality", key: () => finality },
                { header: "Rank", key: "rank" },
                { header: "Project ID", key: "projectId" },
                { header: "Project Title", key: (r) => r.project.title },
                { header: "Review Count", key: "reviewCount" },
                { header: "Raw Mean", key: "rawMean" },
                { header: "Normalized Mean", key: "normalizedMean" },
                { header: "SD", key: (r) => r.sd != null ? r.sd.toFixed(2) : "0.00" }
            ]);
        } else {
            return new NextResponse("Invalid export type", { status: 400 });
        }
    }

    return new NextResponse(csvStr, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "private, no-store",
            "Content-Disposition": `attachment; filename="${filename}"`
        }
    });
}
