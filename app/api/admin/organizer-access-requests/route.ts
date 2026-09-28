import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const status = url.searchParams.get("status") || undefined;

        const whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        const requests = await prisma.organizerAccessRequest.findMany({
            where: whereClause,
            include: {
                applicant: {
                    select: {
                        name: true,
                        email: true,
                        canCreateEvents: true
                    }
                }
            },
            orderBy: [
                { status: "asc" }, // PENDING first, since enum PENDING is first
                { createdAt: "desc" }
            ],
            take: limit
        });

        return NextResponse.json({ requests });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
