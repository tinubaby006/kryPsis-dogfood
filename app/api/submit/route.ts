import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { upsertProjectInternal } from '@/app/actions/projects';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const body = await req.json();
        const eventId = body.eventId || "evt_01"; 

        // Find the user's team for this event
        const teamMember = await prisma.teamMember.findFirst({
            where: { userId: session.user.id, team: { eventId } },
            include: { team: true }
        });

        if (!teamMember) {
            return NextResponse.json({ error: "Forbidden: Not a team member" }, { status: 403 });
        }

        // Attempt to submit project via real submission service
        const result = await upsertProjectInternal({
            eventId,
            teamId: teamMember.teamId,
            title: body.title || "dogfood-late-submission-probe",
            summary: body.summary || "probe",
            description: body.description || "probe description",
            techTags: [],
            status: "SUBMITTED",
            version: 1,
            assets: [],
            answers: []
        }, session.user.id);

        if (!result.success) {
            const err = result.error || "";
            if (err.includes("409 EVENT_CLOSED")) {
                return NextResponse.json({ error: "EVENT_CLOSED" }, { status: 400 });
            }
            if (err.includes("Forbidden") || err.includes("403")) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            return NextResponse.json({ error: err }, { status: 422 });
        }

        return NextResponse.json({ success: true, project: result.project }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Invalid request" }, { status: 500 });
    }
}
