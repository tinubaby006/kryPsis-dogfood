import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEventOrganizer, PermissionError } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ eventId: string, accessId: string }> }
) {
    const { eventId, accessId } = await params;
    
    let user;
    try {
        user = await requireEventOrganizer(eventId);
    } catch (e: any) {
        if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const access = await tx.eventJudgeAccess.findUnique({ where: { id: accessId, eventId } });
            if (!access) throw new Error("Not found");
            if (access.status === "REVOKED" || access.status === "EXPIRED") {
                return access; // Idempotent
            }

            const updated = await tx.eventJudgeAccess.update({
                where: { id: accessId },
                data: {
                    status: "REVOKED",
                    revokedAt: new Date(),
                    version: { increment: 1 }
                }
            });

            if (access.userId) {
                await tx.judgeTrack.deleteMany({ where: { eventId, userId: access.userId } });
                await tx.eventRole.deleteMany({ 
                    where: { eventId, userId: access.userId, role: "JUDGE" }
                });
            }

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_ACCESS_REVOKED",
                    actorUserId: user.id,
                    entityType: "EVENT",
                    entityId: eventId,
                    metadata: { accessId, userId: access.userId }
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, access: result });
    } catch (e: any) {
        if (e.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
