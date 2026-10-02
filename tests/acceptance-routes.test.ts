import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    prisma: {
        eventRole: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
        eventJudgeAccess: { findUnique: vi.fn(), findMany: vi.fn() },
        stageJudge: { findMany: vi.fn() },
        rubricAssignment: { findMany: vi.fn() },
        review: { findMany: vi.fn() },
        user: { findUnique: vi.fn() },
        judgingStage: { findUnique: vi.fn() }
    }
}));
vi.mock('@/lib/session', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
import { GET as scores } from '@/app/api/judge/scores/route';
import { GET as csv } from '@/app/organizer/events/[eventId]/exports/route';
const request = (path: string) => new Request('http://localhost:3000' + path);
const params = { params: Promise.resolve({ eventId: 'evt_01' }) };
beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: 'judge-a', email: 'judge@example.com' } });
    mocks.prisma.eventRole.findMany.mockResolvedValue([{ eventId: 'evt_01' }]);
    mocks.prisma.eventJudgeAccess.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    mocks.prisma.stageJudge.findMany.mockResolvedValue([{ stageId: 'stage-1' }]);
    mocks.prisma.rubricAssignment.findMany.mockResolvedValue([]);
    mocks.prisma.review.findMany.mockResolvedValue([]);
    mocks.prisma.user.findUnique.mockResolvedValue({ isPlatformAdmin: false });
});
describe('judge score authorization', () => {
    it('rejects unauthenticated requests before reading scores', async () => {
        mocks.getSession.mockResolvedValue(null);
        expect((await scores(request('/api/judge/scores'))).status).toBe(401);
        expect(mocks.prisma.review.findMany).not.toHaveBeenCalled();
    });
    it('returns real own historical evidence scoped to the requested membership', async () => {
        mocks.prisma.review.findMany.mockResolvedValue([{ id: 'review-own', scores: [{ value: 4 }] }]);
        const res = await scores(request('/api/judge/scores?eventId=evt_01&judgeUserId=judge-a'));
        expect(res.status).toBe(200);
        expect((await res.json()).historicalReviews[0].id).toBe('review-own');
        expect(res.headers.get('cache-control')).toContain('no-store');
        expect(mocks.prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { judgeUserId: 'judge-a', eventId: { in: ['evt_01'] } }
        }));
    });
    it('blocks a valid judge attempting a peer score resource', async () => {
        expect((await scores(request('/api/judge/scores?judgeUserId=judge-b'))).status).toBe(403);
        expect(mocks.prisma.review.findMany).not.toHaveBeenCalled();
    });
    it('blocks a participant with no judge membership', async () => {
        mocks.prisma.eventRole.findMany.mockResolvedValue([]);
        expect((await scores(request('/api/judge/scores?eventId=evt_01'))).status).toBe(403);
    });
    it('cannot substitute a judge membership in a different event', async () => {
        mocks.prisma.eventRole.findMany.mockResolvedValue([]);
        expect((await scores(request('/api/judge/scores?eventId=other'))).status).toBe(403);
        expect(mocks.prisma.eventRole.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'judge-a', role: 'JUDGE', eventId: 'other' }
        }));
    });
    it('restricts new assignments to active stage panels and excludes cancellations', async () => {
        await scores(request('/api/judge/scores?eventId=evt_01'));
        expect(mocks.prisma.rubricAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ judgeUserId: 'judge-a', stageId: { in: ['stage-1'] }, status: { not: 'CANCELLED' } })
        }));
    });
});
describe('organizer historical CSV', () => {
    it('requires authentication', async () => {
        mocks.getSession.mockResolvedValue(null);
        expect((await csv(request('/exports?type=historical_reviews'), params)).status).toBe(401);
    });
    it('denies a judge even when logged in', async () => {
        mocks.prisma.eventRole.findUnique.mockResolvedValue(null);
        expect((await csv(request('/exports?type=historical_reviews'), params)).status).toBe(403);
        expect(mocks.prisma.review.findMany).not.toHaveBeenCalled();
    });
    it('exports real criterion evidence as a non-admin event organizer without a fake stage', async () => {
        mocks.prisma.eventRole.findUnique.mockResolvedValue({ role: 'ORGANIZER' });
        mocks.prisma.review.findMany.mockResolvedValue([{
            id: 'r1', projectId: 'p1', judgeUserId: 'j1', source: 'FIXTURE',
            comment: '=formula,"quote"\nnext',
            scores: [{ criterion: { key: 'quality' }, value: 4 }],
            project: { title: 'Project 1' },
            judge: { name: 'Judge 1', email: 'judge@example.com' }
        }]);
        const res = await csv(request('/exports?type=historical_reviews'), params);
        const body = await res.text();
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/csv');
        expect(res.headers.get('cache-control')).toContain('no-store');
        expect(body).toContain('quality');
        expect(body).toContain('4');
        expect(body).toContain('"\'=formula,""quote""\nnext"');
        expect(mocks.prisma.judgingStage.findUnique).not.toHaveBeenCalled();
        expect(mocks.prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: 'evt_01', source: 'FIXTURE' } }));
    });
    it('keeps stageId mandatory for ordinary stage exports', async () => {
        mocks.prisma.eventRole.findUnique.mockResolvedValue({ role: 'ORGANIZER' });
        expect((await csv(request('/exports?type=results'), params)).status).toBe(400);
    });
});
