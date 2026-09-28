import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashToken } from "@/lib/auth-utils";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;
    const tokenHash = hashToken(token);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const access = await tx.eventJudgeAccess.findUnique({
                where: { tokenHash }
            });

            if (!access) throw new Error("404 NOT_FOUND: Invalid or expired invitation");
            if (access.status !== "INVITED") throw new Error("409 CONFLICT: Invitation is no longer active");
            if (access.expiresAt && access.expiresAt < new Date()) {
                await tx.eventJudgeAccess.update({
                    where: { id: access.id },
                    data: { status: "EXPIRED" }
                });
                throw new Error("409 CONFLICT: Invitation has expired");
            }

            const user = await tx.user.findUnique({ where: { id: session.user.id } });
            if (!user) throw new Error("User not found");

            if (user.email.toLowerCase() !== access.emailNormalized) {
                throw new Error(`403 FORBIDDEN: This invitation is for ${access.emailNormalized}. Please log in with the correct account.`);
            }

            // Check if user has conflicting role in this event
            const conflict = await tx.eventRole.findFirst({
                where: { eventId: access.eventId, userId: user.id, role: { in: ["ORGANIZER", "PARTICIPANT"] } }
            });

            if (conflict) {
                throw new Error(`409 CONFLICT: You cannot judge this event because you have a conflicting role: ${conflict.role}`);
            }

            // In Stage 5D, accepting an offline invitation puts it into AWAITING_CONFIRMATION 
            // since the email wasn't verified at invite time and we need the organizer to confirm.
            const updated = await tx.eventJudgeAccess.update({
                where: { id: access.id },
                data: {
                    status: "AWAITING_CONFIRMATION",
                    userId: user.id,
                    acceptedAt: new Date(),
                    tokenHash: null, // Consume token
                    version: { increment: 1 }
                }
            });

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_INVITATION_ACCEPTED",
                    actorUserId: user.id,
                    entityType: "EVENT",
                    entityId: access.eventId,
                    metadata: { accessId: access.id }
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, access: result });
    } catch (e: any) {
        if (e.message?.includes("404")) return NextResponse.json({ error: e.message }, { status: 404 });
        if (e.message?.includes("409")) return NextResponse.json({ error: e.message }, { status: 409 });
        if (e.message?.includes("403")) return NextResponse.json({ error: e.message }, { status: 403 });
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
