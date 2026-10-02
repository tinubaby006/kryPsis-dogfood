import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const privateHeaders = { 'Cache-Control': 'private, no-store' };
    
    try {
        const user = await requireAuthenticatedUser();
        const userId = user.id;
        
        const targetUserId = url.searchParams.get('judgeUserId');
        if (targetUserId && targetUserId !== userId) {
            return new NextResponse('Forbidden: Cannot view peer scores', { status: 403, headers: privateHeaders });
        }
        
        const eventId = url.searchParams.get('eventId');
        const roles = await prisma.eventRole.findMany({
            where: { userId, role: 'JUDGE', ...(eventId ? { eventId } : {}) }, select: { eventId: true }
        });
        const eventIds = roles.map(role => role.eventId);
        if (!eventIds.length) return new NextResponse('Forbidden', { status: 403, headers: privateHeaders });
        
        const activePanel = await prisma.stageJudge.findMany({
            where: { judgeUserId: userId, isActive: true, stage: { eventId: { in: eventIds } } },
            select: { stageId: true }
        });
        
        const assignments = await prisma.rubricAssignment.findMany({
            where: {
                judgeUserId: userId, status: { not: 'CANCELLED' },
                stageId: { in: activePanel.map(panel => panel.stageId) },
                stage: { eventId: { in: eventIds } }
            },
            include: { finalReview: { include: { scores: true } } },
            orderBy: [{ stageId: 'asc' }, { projectId: 'asc' }]
        });
        
        const historicalReviews = await prisma.review.findMany({
            where: { 
                judgeUserId: userId,
                eventId: { in: eventIds }
            },
            include: { scores: true },
            orderBy: [{ eventId: 'asc' }, { projectId: 'asc' }]
        });
        
        return NextResponse.json({ success: true, assignments, historicalReviews }, { headers: privateHeaders });
    } catch (e: any) {
        if (e.statusCode) {
            return new NextResponse(e.message, { status: e.statusCode, headers: privateHeaders });
        }
        return new NextResponse('Internal Error', { status: 500, headers: privateHeaders });
    }
}
