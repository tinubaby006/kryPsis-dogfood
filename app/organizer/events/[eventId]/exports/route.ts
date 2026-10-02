import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

function safeCsvField(value: any) {
    if (value === null || value === undefined) return '""';
    let str = String(value).replace(/"/g, '""');
    // Safe spreadsheet handling of user-entered formula-like text
    if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
    }
    return `"${str}"`;
}

function toCsv(rows: any[][]) {
    return rows.map(r => r.map(safeCsvField).join(",")).join("\n");
}

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const stageId = url.searchParams.get("stageId");

    const session = await getSession();
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const role = await prisma.eventRole.findFirst({
        where: { eventId, userId: session.user.id, role: "ORGANIZER" }
    });
    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!role && !adminUser?.isPlatformAdmin) return new NextResponse("Forbidden", { status: 403 });

    // Historical evidence has no live judging-stage completion semantics.
    if (type === "historical_reviews") {
        const reviews = await prisma.review.findMany({
            where: { eventId },
            include: { scores: { include: { criterion: true }, orderBy: { criterionId: "asc" } } },
            orderBy: [{ projectId: "asc" }, { judgeUserId: "asc" }, { id: "asc" }]
        });
        const rows = reviews.flatMap(review => review.scores.map(score => [
            eventId, review.id, review.projectId, review.judgeUserId,
            score.criterion.key, score.value.toString(), review.comment, review.source
        ]));
        return new NextResponse("\uFEFF" + toCsv([
            ["Event ID", "Review ID", "Project ID", "Judge User ID", "Criterion", "Score", "Comment", "Source"],
            ...rows
        ]), { headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="historical_reviews.csv"',
            "Cache-Control": "private, no-store"
        } });
    }

    if (!stageId) return new NextResponse("Missing stageId", { status: 400 });

    const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
    if (!stage) return new NextResponse("Stage not found", { status: 404 });

    let headers: string[] = [];
    let data: any[][] = [];
    let filename = `export_${type}_${stageId}.csv`;

    if (type === "assignments") {
        const assignments = await prisma.rubricAssignment.findMany({
            where: { stageId }
        });
        headers = ["Assignment ID", "Project ID", "Judge User ID", "Status", "Created At"];
        data = assignments.map(a => [a.id, a.projectId, a.judgeUserId, a.status, a.createdAt.toISOString()]);
    } else if (type === "raw_reviews") {
        const assignments = await prisma.rubricAssignment.findMany({
            where: { stageId },
            include: { finalReview: { include: { scores: true } } }
        });
        headers = ["Assignment ID", "Project ID", "Judge User ID", "Criterion ID", "Score"];
        for (const asn of assignments) {
            if (asn.finalReview) {
                for (const sc of asn.finalReview.scores) {
                    data.push([asn.id, asn.projectId, asn.judgeUserId, sc.criterionId, sc.value]);
                }
            }
        }
    } else if (type === "diagnostics") {
        const run = await prisma.calculationRun.findFirst({
            where: { stageId },
            orderBy: { finishedAt: 'desc' },
            include: { calibrations: true }
        });
        headers = ["Judge User ID", "Review Count", "Offset (Bias)"];
        if (run) {
            data = run.calibrations.map(c => [c.judgeUserId, c.reviewCount, c.offset]);
        }
    } else if (type === "results") {
        const run = await prisma.calculationRun.findFirst({
            where: { stageId },
            orderBy: { finishedAt: 'desc' },
            include: { projectResults: true }
        });
        headers = ["Rank", "Project ID", "Review Count", "Raw Mean", "Normalized Mean", "SD"];
        if (run && (stage.state === "FINALIZED" || (stage.outputPolicy as any)?.isPublished)) {
            const sorted = run.projectResults.sort((a,b) => (a.rank||0) - (b.rank||0));
            data = sorted.map(r => [r.rank, r.projectId, r.reviewCount, r.rawMean, r.normalizedMean, r.sd]);
        } else if (run && stage.state !== "FINALIZED") {
            // "Never label incomplete/calibration-unsupported scores final."
            headers.push("WARNING");
            data.push(["STAGE NOT FINALIZED. SCORES ARE PROVISIONAL OR INCOMPLETE."]);
        }
    } else {
        return new NextResponse("Invalid export type", { status: 400 });
    }

    const csvStr = toCsv([headers, ...data]);
    return new NextResponse("\uFEFF" + csvStr, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "private, no-store",
            "Content-Disposition": `attachment; filename="${filename}"`
        }
    });
}
