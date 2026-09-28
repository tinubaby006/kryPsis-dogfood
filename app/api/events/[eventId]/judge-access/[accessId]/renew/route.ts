import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { randomBytes } from "crypto";
import { hashToken } from "@/lib/auth-utils";

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
            const access = await tx.eventJudgeAccess.findUnique({ where: { id: accessId, eventId } });
            if (!access) throw new Error("Not found");
            
            if (access.status !== "INVITED" && access.status !== "EXPIRED") {
                throw new Error("422 UNPROCESSABLE: Can only renew pending or expired invitations");
            }

            const rawToken = randomBytes(32).toString("hex");
            const tokenHash = hashToken(rawToken);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const updated = await tx.eventJudgeAccess.update({
                where: { id: accessId },
                data: {
                    status: "INVITED",
                    tokenHash,
                    expiresAt,
                    version: { increment: 1 }
                }
            });

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_ACCESS_RENEWED",
                    actorUserId: session.user.id,
                    entityType: "EVENT",
                    entityId: eventId,
                    metadata: { accessId }
                }
            });

            return { access: updated, rawToken };
        });

        return NextResponse.json({ success: true, ...result });
    } catch (e: any) {
        if (e.message?.includes("422")) return NextResponse.json({ error: e.message }, { status: 422 });
        if (e.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
