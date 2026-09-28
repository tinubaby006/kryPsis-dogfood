import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!adminUser?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { reason } = body;

        if (!reason) {
            return NextResponse.json({ error: "Reason required for revocation" }, { status: 422 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id } });
            if (!user) throw new Error("User not found");

            if (!user.canCreateEvents) {
                throw new Error("User does not have organizer capability");
            }

            const updatedUser = await tx.user.update({
                where: { id },
                data: { canCreateEvents: false }
            });

            // Mark any pending or approved requests as REVOKED (optional but good for state)
            await tx.organizerAccessRequest.updateMany({
                where: { 
                    applicantUserId: id, 
                    status: { in: ["PENDING", "APPROVED"] } 
                },
                data: { 
                    status: "REVOKED",
                    decisionReason: reason
                }
            });

            await tx.auditLog.create({
                data: {
                    action: "ORGANIZER_ACCESS_REVOKED",
                    actorUserId: session.user.id,
                    entityType: "USER",
                    entityId: id,
                    metadata: { reason }
                }
            });

            return updatedUser;
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.message === "User not found") {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
