import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(
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
        const body = await request.json();
        const { trackIds, expectedVersion } = body;

        if (!Array.isArray(trackIds) || trackIds.length === 0) {
            return NextResponse.json({ error: "At least one track required" }, { status: 422 });
        }
        if (typeof expectedVersion !== "number") {
            return NextResponse.json({ error: "expectedVersion required" }, { status: 422 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const access = await tx.eventJudgeAccess.findUnique({ where: { id: accessId, eventId } });
            if (!access) throw new Error("Not found");
            if (access.version !== expectedVersion) throw new Error("409 CONFLICT: State changed");
            if (access.status === "REVOKED" || access.status === "EXPIRED") {
                throw new Error("422 UNPROCESSABLE: Cannot modify inactive access");
            }

            // Update scope
            await tx.eventJudgeAccessTrack.deleteMany({ where: { accessId } });
            await tx.eventJudgeAccessTrack.createMany({
                data: trackIds.map((id: string) => ({ accessId, eventId, trackId: id }))
            });

            const updated = await tx.eventJudgeAccess.update({
                where: { id: accessId },
                data: { version: { increment: 1 } }
            });

            // Reconcile active rows if ACTIVE
            if (access.status === "ACTIVE" && access.userId) {
                await tx.judgeTrack.deleteMany({ where: { eventId, userId: access.userId } });
                await tx.judgeTrack.createMany({
                    data: trackIds.map((id: string) => ({ eventId, userId: access.userId!, trackId: id }))
                });
            }

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_ACCESS_UPDATED",
                    actorUserId: session.user.id,
                    entityType: "EVENT",
                    entityId: eventId,
                    metadata: { accessId, trackIds }
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
