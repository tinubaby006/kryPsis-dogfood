import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const requests = await prisma.organizerAccessRequest.findMany({
            where: {
                applicantUserId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { canCreateEvents: true }
        });

        return NextResponse.json({ 
            requests,
            canCreateEvents: user?.canCreateEvents || false
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
