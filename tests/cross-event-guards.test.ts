import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    prisma: {
        event: { findFirst: vi.fn(), findUnique: vi.fn() },
        eventRole: { findFirst: vi.fn(), findUnique: vi.fn() },
        eventJudgeAccess: { findUnique: vi.fn(), findMany: vi.fn() },
        user: { findUnique: vi.fn() },
        judgingStage: { findUnique: vi.fn() },
        rubricAssignment: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
        stageJudge: { findUnique: vi.fn() },
        track: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), delete: vi.fn() },
        project: { count: vi.fn() },
        prize: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), delete: vi.fn() },
        customQuestion: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), delete: vi.fn() },
        reviewDraft: { upsert: vi.fn(), deleteMany: vi.fn() },
        rubricVersion: { findFirst: vi.fn() },
        stageReview: { findUnique: vi.fn(), create: vi.fn() },
        $transaction: vi.fn(async (cb) => cb(mocks.prisma)),
        $queryRaw: vi.fn()
    }
}));
vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));

import { getAssignmentPreviewAction } from '@/app/organizer/events/[eventId]/judging-actions';
import { requireJudgeAccess } from '@/lib/judging/auth';
import { updateEventConfig } from '@/app/actions/events';
import { submitReviewAction } from '@/app/events/[eventId]/judge/assignments/[assignmentId]/actions';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1', email: 'judge@example.com' } });
    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isPlatformAdmin: false });
    mocks.prisma.eventRole.findFirst.mockResolvedValue({ role: 'ORGANIZER' });
    mocks.prisma.eventRole.findUnique.mockResolvedValue({ role: 'ORGANIZER' });
    mocks.prisma.eventJudgeAccess.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    mocks.prisma.event.findFirst.mockResolvedValue({ id: "event-A" });
    mocks.prisma.track.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.project.count.mockResolvedValue(0);
    mocks.prisma.prize.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.customQuestion.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.$transaction.mockImplementation(async (cb) => cb(mocks.prisma));
});

describe('Cross-Event Server Guards', () => {
    it('Organizer in Event A cannot preview assignments for Stage in Event B', async () => {
        // Organizer is authorized for event-A
        mocks.prisma.judgingStage.findUnique.mockResolvedValue(null); // Stage not found because eventId mismatch
        
        const res = await getAssignmentPreviewAction("event-A", "stage-event-B");
        expect(res.error).toBe("Stage not found");
        expect(mocks.prisma.judgingStage.findUnique).toHaveBeenCalledWith({
            where: { id: "stage-event-B", eventId: "event-A" }
        });
    });

    it('updateEventConfig rejects updating a track belonging to another event', async () => {
        mocks.prisma.track.findMany.mockResolvedValue([{ id: "track-event-A" }]); // existing tracks for event A
        
        const res = await updateEventConfig("event-A", {
            tracks: [{ id: "track-event-B", name: "Hacked", sortOrder: 1, description: "" }],
            prizes: [],
            questions: []
        });

        expect(res.error).toMatch(/does not belong to this event/);
        expect(mocks.prisma.track.update).not.toHaveBeenCalled();
    });

    it('requireJudgeAccess rejects an assignment belonging to another event', async () => {
        mocks.prisma.judgingStage.findUnique.mockResolvedValue({ id: "stage-1" });
        mocks.prisma.eventRole.findUnique.mockResolvedValue({ role: "JUDGE" });
        mocks.prisma.rubricAssignment.findUnique.mockResolvedValue({
            id: "asn-1",
            judgeUserId: "user-1",
            stage: { eventId: "event-B", state: "OPEN" }, // mismatch!
            status: "PENDING"
        });

        await expect(requireJudgeAccess("event-A", "asn-1")).rejects.toThrow(/does not belong to this event/);
    });
});

describe('Concurrent Close/Submit Testing', () => {
    it('submitReviewAction fails if stage is CLOSED concurrently during transaction', async () => {
        mocks.prisma.judgingStage.findUnique.mockResolvedValue({ id: "stage-1" });
        mocks.prisma.eventRole.findUnique.mockResolvedValue({ role: "JUDGE" });
        
        let callCount = 0;
        // Initial assignment fetch outside transaction: Stage is OPEN
        mocks.prisma.rubricAssignment.findUnique.mockImplementation(({ where }) => {
            callCount++;
            return Promise.resolve({
                id: where.id,
                judgeUserId: "user-1",
                stageId: "stage-1",
                status: "PENDING",
                stage: { eventId: "event-A", state: callCount === 1 ? "OPEN" : "CLOSED", origin: "LIVE" }
            });
        });
        
        mocks.prisma.stageJudge.findUnique.mockResolvedValue({ isActive: true });
        mocks.prisma.rubricVersion.findFirst.mockResolvedValue({
            id: "rv-1",
            criteria: [{ id: "c-1", maxScore: 10 }]
        });

        // Inside the transaction, the stage state is fetched again and it is now CLOSED
        mocks.prisma.judgingStage.findUnique.mockResolvedValue({
            id: "stage-1",
            state: "CLOSED"
        });

        const res = await submitReviewAction("event-A", "asn-1", { "c-1": 5 }, "comment");
        expect((res as any).error || (res as any).message).toMatch(/Stage no longer OPEN|must be OPEN/);
    });
});
