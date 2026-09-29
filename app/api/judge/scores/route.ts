import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const judgeUserId = url.searchParams.get("judgeUserId");
    const reqHeaders = request.headers;
    console.log("Headers:", Object.fromEntries(reqHeaders.entries()));
    const session = await getSession();
    console.log("Session in GET:", session);

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    if (judgeUserId && judgeUserId !== session.user.id) {
        return new NextResponse("Forbidden: Cannot view peer scores", { status: 403 });
    }

    const hasJudgeRole = await prisma.eventRole.findFirst({
        where: { userId: session.user.id, role: "JUDGE" }
    });
    const hasStageJudge = await prisma.stageJudge.findFirst({
        where: { judgeUserId: session.user.id }
    });

    if (!hasJudgeRole && !hasStageJudge) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // Genuinely address judge's scores
    const targetUserId = judgeUserId || session.user.id;
    const assignments = await prisma.rubricAssignment.findMany({
        where: { judgeUserId: targetUserId },
        include: { finalReview: { include: { scores: true } } }
    });

    return NextResponse.json({ success: true, assignments });
}
