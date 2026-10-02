import { getSession } from './session';
import { prisma } from './db';
import { PrismaClient, EventJudgeAccessStatus, RecordSource, AssignmentStatus } from '@prisma/client';

export class PermissionError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.statusCode = statusCode;
    this.name = "PermissionError";
  }
}
export class ValidationError extends Error {
  public statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 422;
  }
}
export class StateError extends Error {
  public statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "StateError";
    this.statusCode = 409;
  }
}

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function requireAuthenticatedUser() {
    const session = await getSession();
    if (!session?.user) throw new PermissionError('Unauthorized', 401);
    return session.user;
}

export async function requireEventOrganizer(eventId: string, tx: TxClient = prisma as unknown as TxClient) {
    const sessionUser = await requireAuthenticatedUser();
    const dbUser = await tx.user.findUnique({ where: { id: sessionUser.id } });
    if (dbUser?.isPlatformAdmin) return dbUser;
    
    const role = await tx.eventRole.findUnique({
        where: { eventId_userId: { eventId, userId: sessionUser.id } }
    });
    if (role?.role === 'ORGANIZER') return dbUser!;
    
    throw new PermissionError('Forbidden: Requires organizer or platform admin access', 403);
}

export async function requireEventJudge(eventId: string, tx: TxClient = prisma as unknown as TxClient) {
    const user = await requireAuthenticatedUser();
    
    const role = await tx.eventRole.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } }
    });
    if (role?.role !== 'JUDGE') {
        throw new PermissionError('Forbidden: Requires judge role', 403);
    }

    const access = await tx.eventJudgeAccess.findUnique({
        where: { eventId_emailNormalized: { eventId, emailNormalized: user.email.toLowerCase() } }
    });
    if (!access || access.status !== EventJudgeAccessStatus.ACTIVE) {
        throw new PermissionError('Forbidden: Judge access is not ACTIVE', 403);
    }
    
    return user;
}

export async function requireJudgeAssignment(
    eventId: string, 
    assignmentId: string, 
    options: { mode: 'read' | 'write' } = { mode: 'read' }, 
    tx: TxClient = prisma as unknown as TxClient
) {
    const user = await requireEventJudge(eventId, tx);

    const assignment = await tx.rubricAssignment.findUnique({
        where: { id: assignmentId },
        include: { stage: true }
    });

    if (!assignment) {
        throw new PermissionError('Not Found: Assignment does not exist', 404);
    }
    if (assignment.stage.eventId !== eventId) {
        throw new PermissionError('Not Found: Assignment mismatch', 404);
    }
    if (assignment.judgeUserId !== user.id) {
        throw new PermissionError('Forbidden: Cannot access peer assignment', 403);
    }
    if (assignment.status === AssignmentStatus.CANCELLED) {
        throw new PermissionError('Forbidden: Assignment is CANCELLED', 403);
    }

    const stageJudge = await tx.stageJudge.findUnique({
        where: { stageId_judgeUserId: { stageId: assignment.stageId, judgeUserId: user.id } }
    });
    if (!stageJudge || !stageJudge.isActive) {
        throw new PermissionError('Forbidden: Not an active judge in this stage', 403);
    }

    if (options.mode === 'write') {
        if (assignment.stage.origin !== RecordSource.LIVE) {
            throw new PermissionError('Forbidden: Cannot write to non-LIVE stage', 403);
        }
        if (assignment.stage.state !== 'OPEN') {
            throw new PermissionError(`Forbidden: Stage state is ${assignment.stage.state}, must be OPEN`, 403);
        }
        const now = new Date();
        if (assignment.stage.startsAt && now < assignment.stage.startsAt) {
            throw new PermissionError('Forbidden: Judging has not started', 403);
        }
        if (assignment.stage.endsAt && now > assignment.stage.endsAt) {
            throw new PermissionError('Forbidden: Judging window is closed', 403);
        }
    }

    return { user, assignment };
}
