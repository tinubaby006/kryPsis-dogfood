import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function requireJudgeAccess(eventId: string, assignmentId?: string, opts: { requireWrite?: boolean } = {}) {
    const { requireWrite = true } = opts;
    const session = await getSession();
    if (!session?.user) {
        throw new Error("401 UNAUTHORIZED");
    }

    const userId = session.user.id;

    // Resolve eventId in case a slug was provided
    const event = await prisma.event.findFirst({
        where: {
            OR: [
                { id: eventId },
                { slug: eventId }
            ]
        }
    });

    if (!event) {
        throw new Error("404 NOT FOUND: Event not found");
    }
    const resolvedEventId = event.id;

    // Is the user actually a JUDGE for this event?
    const eventRole = await prisma.eventRole.findUnique({
        where: { eventId_userId: { eventId: resolvedEventId, userId } }
    });

    if (!eventRole || eventRole.role !== "JUDGE") {
        throw new Error("403 FORBIDDEN: Not a judge for this event");
    }

    if (assignmentId) {
        // Validate assignment ownership
        const assignment = await prisma.rubricAssignment.findUnique({
            where: { id: assignmentId },
            include: { stage: true }
        });

        if (!assignment) throw new Error("404 NOT FOUND: Assignment not found");
        if (assignment.stage.eventId !== resolvedEventId) {
            throw new Error("403 FORBIDDEN: Assignment does not belong to this event");
        }
        if (assignment.judgeUserId !== userId) {
            throw new Error("403 FORBIDDEN: You do not own this assignment");
        }
        if (assignment.status === "CANCELLED") {
            throw new Error("403 FORBIDDEN: This assignment has been cancelled");
        }

        const stageJudge = await prisma.stageJudge.findUnique({
            where: { stageId_judgeUserId: { stageId: assignment.stageId, judgeUserId: userId } }
        });

        if (!stageJudge || !stageJudge.isActive) {
            throw new Error("403 FORBIDDEN: Your judge access for this stage has been revoked or suspended");
        }
        
        if (requireWrite) {
            // Stage state verification
            if (assignment.stage.state !== "OPEN") {
                throw new Error("403 FORBIDDEN: Stage is not OPEN for judging");
            }

            // Timeframe verification
            const now = new Date();
            if (assignment.stage.startsAt && now < assignment.stage.startsAt) {
                throw new Error("403 FORBIDDEN: Judging period has not started yet");
            }
            if (assignment.stage.endsAt && now > assignment.stage.endsAt) {
                throw new Error("403 FORBIDDEN: Judging period has ended");
            }
        }

        return { userId, resolvedEventId, assignment, stage: assignment.stage };
    }

    return { userId, resolvedEventId };
}
