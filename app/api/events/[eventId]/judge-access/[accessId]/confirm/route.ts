import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ eventId: string, accessId: string }> }
) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { eventId, accessId } = await params;

    const organizer = await prisma.eventRole.findFirst({
        where: { eventId, userId: session.user.id, role: "ORGANIZER" }
    });
    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    
    if (!organizer && !adminUser?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const access = await tx.eventJudgeAccess.findUnique({ 
                where: { id: accessId, eventId },
                include: { tracks: true }
            });
            if (!access) throw new Error("Not found");
            if (access.status !== "AWAITING_CONFIRMATION") {
                throw new Error("422 UNPROCESSABLE: Not awaiting confirmation");
            }
            if (!access.userId) {
                throw new Error("422 UNPROCESSABLE: Missing user ID on access record");
            }

            // Check conflicts again
            const conflict = await tx.eventRole.findFirst({
                where: { eventId, userId: access.userId, role: { in: ["ORGANIZER", "PARTICIPANT"] } }
            });
            if (conflict) {
                throw new Error(`409 CONFLICT: User has conflicting role: ${conflict.role}`);
            }

            const updated = await tx.eventJudgeAccess.update({
                where: { id: accessId },
                data: {
                    status: "ACTIVE",
                    confirmedById: session.user.id,
                    confirmedAt: new Date(),
                    version: { increment: 1 }
                }
            });

            // Upsert event role
            await tx.eventRole.upsert({
                where: { eventId_userId: { eventId, userId: access.userId } },
                update: { role: "JUDGE" },
                create: { eventId, userId: access.userId, role: "JUDGE" }
            });

            // Sync tracks
            await tx.judgeTrack.deleteMany({ where: { eventId, userId: access.userId } });
            await tx.judgeTrack.createMany({
                data: access.tracks.map(t => ({ eventId, userId: access.userId!, trackId: t.trackId }))
            });

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_ACCESS_CONFIRMED",
                    actorUserId: session.user.id,
                    entityType: "EVENT",
                    entityId: eventId,
                    metadata: { accessId, userId: access.userId }
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, access: result });
    } catch (e: any) {
        if (e.message?.includes("409 CONFLICT")) return NextResponse.json({ error: e.message }, { status: 409 });
        if (e.message?.includes("422")) return NextResponse.json({ error: e.message }, { status: 422 });
        if (e.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
