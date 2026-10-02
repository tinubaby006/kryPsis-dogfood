import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuthenticatedUser, requireEventOrganizer, requireEventJudge, requireJudgeAssignment, PermissionError } from '../lib/permissions';

// Mock getSession to return a specific user
vi.mock('@/lib/session', () => ({
    getSession: vi.fn()
}));
import { getSession } from '@/lib/session';

// Mock prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        eventRole: { findUnique: vi.fn(), findFirst: vi.fn() },
        user: { findUnique: vi.fn() },
        stageJudge: { findUnique: vi.fn(), findFirst: vi.fn() },
        rubricAssignment: { findUnique: vi.fn() },
        eventJudgeAccess: { findUnique: vi.fn() }
    }
}));
import { prisma } from '@/lib/db';

describe('Permissions', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('requireAuthenticatedUser', () => {
        it('throws if no session', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            await expect(requireAuthenticatedUser()).rejects.toThrow(PermissionError);
        });

        it('returns user if session exists', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as any);
            const user = await requireAuthenticatedUser();
            expect(user.id).toBe('u1');
        });
    });

    describe('requireEventOrganizer', () => {
        it('allows platform admin', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isPlatformAdmin: true } as any);

            const user = await requireEventOrganizer('e1');
            expect(user.id).toBe('u1');
        });

        it('allows event organizer', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'ORGANIZER' } as any);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isPlatformAdmin: false } as any);

            const user = await requireEventOrganizer('e1');
            expect(user.id).toBe('u1');
        });

        it('denies participant', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isPlatformAdmin: false } as any);

            await expect(requireEventOrganizer('e1')).rejects.toThrow(/Forbidden/);
        });
    });

    describe('requireEventJudge', () => {
        it('denies if not judge', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue(null);

            await expect(requireEventJudge('e1')).rejects.toThrow(/Forbidden/);
        });

        it('allows if judge role exists and access ACTIVE', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'ACTIVE' } as any);

            const user = await requireEventJudge('e1');
            expect(user.id).toBe('u1');
        });
        
        it('denies if judge role exists but access NOT active', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'REVOKED' } as any);

            await expect(requireEventJudge('e1')).rejects.toThrow(/Forbidden/);
        });
    });

    describe('requireJudgeAssignment', () => {
        it('denies if assignment not found', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'ACTIVE' } as any);
            vi.mocked(prisma.rubricAssignment.findUnique).mockResolvedValue(null);

            await expect(requireJudgeAssignment('e1', 'a1')).rejects.toThrow(/Not Found/);
        });

        it('denies write if judge is inactive in stage', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'ACTIVE' } as any);
            
            const mockAssignment = {
                id: 'a1',
                judgeUserId: 'u1',
                stageId: 's1',
                status: 'PENDING',
                stage: { eventId: 'e1', state: 'OPEN', origin: 'LIVE' }
            };
            vi.mocked(prisma.rubricAssignment.findUnique).mockResolvedValue(mockAssignment as any);
            vi.mocked(prisma.stageJudge.findUnique).mockResolvedValue({ isActive: false } as any);

            await expect(requireJudgeAssignment('e1', 'a1', { mode: 'write' })).rejects.toThrow(/Forbidden/);
        });

        it('denies write if stage is not OPEN', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'ACTIVE' } as any);
            
            const mockAssignment = {
                id: 'a1',
                judgeUserId: 'u1',
                stageId: 's1',
                status: 'PENDING',
                stage: { eventId: 'e1', state: 'ASSIGNING', origin: 'LIVE' }
            };
            vi.mocked(prisma.rubricAssignment.findUnique).mockResolvedValue(mockAssignment as any);
            vi.mocked(prisma.stageJudge.findUnique).mockResolvedValue({ isActive: true } as any);

            await expect(requireJudgeAssignment('e1', 'a1', { mode: 'write' })).rejects.toThrow(/Forbidden/);
        });

        it('allows read regardless of stage state', async () => {
            vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'test@example.com' } } as any);
            vi.mocked(prisma.eventRole.findUnique).mockResolvedValue({ role: 'JUDGE' } as any);
            vi.mocked(prisma.eventJudgeAccess.findUnique).mockResolvedValue({ status: 'ACTIVE' } as any);
            
            const mockAssignment = {
                id: 'a1',
                judgeUserId: 'u1',
                stageId: 's1',
                status: 'PENDING',
                stage: { eventId: 'e1', state: 'CLOSED', origin: 'LIVE' }
            };
            vi.mocked(prisma.rubricAssignment.findUnique).mockResolvedValue(mockAssignment as any);
            vi.mocked(prisma.stageJudge.findUnique).mockResolvedValue({ isActive: true } as any);

            const result = await requireJudgeAssignment('e1', 'a1', { mode: 'read' });
            expect(result.assignment.id).toBe('a1');
        });
    });
});
