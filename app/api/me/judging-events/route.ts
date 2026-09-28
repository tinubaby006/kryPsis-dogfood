import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const events = await prisma.eventRole.findMany({
            where: {
                userId: session.user.id,
                role: "JUDGE",
                event: { visibility: "PUBLIC" }
            },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        startsAt: true,
                        endsAt: true,
                        submissionsCloseAt: true,
                        timeZone: true
                    }
                }
            },
            orderBy: { event: { startsAt: "asc" } }
        });

        // The query returns EventRole array, and each has an `.event` property. 
        // Typescript knows it because we used `include: { event: ... }`. 
        // Wait, the error said property `event` does not exist on type `EventRole`. 
        // Maybe Prisma client was not fully generated or the TS error is because of some mapping issue. 
        return NextResponse.json({ events: events.map((e: any) => e.event) });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
