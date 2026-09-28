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
    
    const { id } = await params;

    try {
        const reqToWithdraw = await prisma.organizerAccessRequest.findUnique({
            where: { id }
        });

        if (!reqToWithdraw) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (reqToWithdraw.applicantUserId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (reqToWithdraw.status !== "PENDING") {
            return NextResponse.json({ error: "Only PENDING requests can be withdrawn" }, { status: 409 });
        }

        const updated = await prisma.organizerAccessRequest.update({
            where: { id },
            data: {
                status: "WITHDRAWN",
                version: { increment: 1 }
            }
        });

        return NextResponse.json({ success: true, request: updated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
