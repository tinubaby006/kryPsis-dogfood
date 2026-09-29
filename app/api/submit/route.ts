import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const eventId = "evt_01"; // Fixture event
        
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        if (new Date() > event.submissionsCloseAt) {
            return NextResponse.json({ error: "EVENT_CLOSED" }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ error: "Invalid request" }, { status: 500 });
    }
}
