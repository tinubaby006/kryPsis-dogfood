import { describe, it, expect, vi, beforeEach } from 'vitest';
import { finalizeCalculation, publishStageAction, getPersistedCalculationAction } from '../app/organizer/events/[eventId]/judging-actions';

// Mock getSession to return a specific user
vi.mock('@/lib/session', () => ({
    getSession: vi.fn()
}));
import { getSession } from '@/lib/session';

// Mock requireOrganizer by mocking the permissions module
vi.mock('@/lib/permissions', () => ({
    requireEventOrganizer: vi.fn().mockResolvedValue({ id: 'u1' })
}));

// Mock calculation preview
vi.mock('@/lib/judging/calculation', () => ({
    generateCalculationPreview: vi.fn()
}));
import { generateCalculationPreview } from '@/lib/judging/calculation';

// Mock next/cache
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

// Mock crypto
vi.mock('crypto', () => {
    return {
        createHash: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn().mockReturnValue('mock-hash')
        })
    };
});

// Mock prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: vi.fn(async (cb) => {
            const tx = {
                judgingStage: { findUnique: vi.fn(), update: vi.fn() },
                finalizationSnapshot: { findUnique: vi.fn(), create: vi.fn() },
                calculationRun: { findUnique: vi.fn() },
                rubricAssignment: { count: vi.fn() },
                $queryRaw: vi.fn()
            };
            // Default mock implementations inside tx
            tx.judgingStage.findUnique.mockResolvedValue({ id: 's1', state: 'CALCULATED', eventId: 'e1' });
            tx.finalizationSnapshot.findUnique.mockResolvedValue(null);
            tx.calculationRun.findUnique.mockResolvedValue({ id: 'r1', status: 'SUCCESS', inputHash: 'ih', configHash: 'ch', projectResults: [] });
            tx.rubricAssignment.count.mockResolvedValue(0);
            return cb(tx);
        }),
        judgingStage: { findUnique: vi.fn(), update: vi.fn() },
        finalizationSnapshot: { findUnique: vi.fn() },
        calculationRun: { findUnique: vi.fn(), findFirst: vi.fn() },
    }
}));
import { prisma } from '@/lib/db';

describe('Judging Execution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1' } } as any);
        vi.mocked(generateCalculationPreview).mockResolvedValue({
            status: 'SUCCESS',
            inputHash: 'ih',
            configHash: 'ch',
            diagnostics: { projectsCount: 1, judgesCount: 1 }
        } as any);
    });

    describe('finalizeCalculation', () => {
        it('finalizes a stage correctly', async () => {
            const result = await finalizeCalculation('e1', 's1', 'r1');
            expect(result).toEqual({ success: true });
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('fails if run is not SUCCESS', async () => {
            vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb) => {
                const tx = {
                    judgingStage: { findUnique: vi.fn().mockResolvedValue({ id: 's1', state: 'CALCULATED' }) },
                    finalizationSnapshot: { findUnique: vi.fn().mockResolvedValue(null) },
                    calculationRun: { findUnique: vi.fn().mockResolvedValue({ id: 'r1', status: 'UNSUPPORTED' }) },
                    $queryRaw: vi.fn()
                } as any;
                return cb(tx);
            });
            const result = await finalizeCalculation('e1', 's1', 'r1');
            expect((result as any).error || (result as any).message).toMatch(/Cannot finalize an unsuccessful calculation run/);
        });

        it('fails if inputHash has changed', async () => {
            vi.mocked(generateCalculationPreview).mockResolvedValue({
                status: 'SUCCESS',
                inputHash: 'ih-changed',
                configHash: 'ch',
            } as any);
            const result = await finalizeCalculation('e1', 's1', 'r1');
            expect((result as any).error || (result as any).message).toMatch(/Stale finalization/);
        });

        it('makes same-run retry idempotent', async () => {
            vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb) => {
                const tx = {
                    judgingStage: { findUnique: vi.fn().mockResolvedValue({ id: 's1', state: 'FINALIZED' }) },
                    finalizationSnapshot: { findUnique: vi.fn().mockResolvedValue({ calculationRunId: 'r1' }) },
                    $queryRaw: vi.fn()
                } as any;
                return cb(tx);
            });
            const result = await finalizeCalculation('e1', 's1', 'r1');
            expect(result).toEqual({ success: true, message: expect.any(String) });
        });

        it('fails on changed-run retry conflict', async () => {
            vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb) => {
                const tx = {
                    judgingStage: { findUnique: vi.fn().mockResolvedValue({ id: 's1', state: 'FINALIZED' }) },
                    finalizationSnapshot: { findUnique: vi.fn().mockResolvedValue({ calculationRunId: 'r2' }) },
                    $queryRaw: vi.fn()
                } as any;
                return cb(tx);
            });
            const result = await finalizeCalculation('e1', 's1', 'r1');
            expect((result as any).error || (result as any).message).toMatch(/Conflict: Stage is already finalized with a different calculation run/);
        });
    });

    describe('publishStageAction', () => {
        it('publishes a finalized stage', async () => {
            vi.mocked(prisma.judgingStage.findUnique).mockResolvedValue({ id: 's1', state: 'FINALIZED' } as any);
            vi.mocked(prisma.finalizationSnapshot.findUnique).mockResolvedValue({ id: 'fs1' } as any);

            const result = await publishStageAction('e1', 's1');
            expect(result).toEqual({ success: true });
            expect(prisma.judgingStage.update).toHaveBeenCalledWith({
                where: { id: 's1' },
                data: { publishedSnapshotId: 'fs1' }
            });
        });

        it('fails if not finalized', async () => {
            vi.mocked(prisma.judgingStage.findUnique).mockResolvedValue({ id: 's1', state: 'CALCULATED' } as any);
            const result = await publishStageAction('e1', 's1');
            expect((result as any).error || (result as any).message).toMatch(/Stage must be FINALIZED before publishing/);
        });
    });

    describe('getPersistedCalculationAction', () => {
        it('gets run from snapshot if finalized', async () => {
            vi.mocked(prisma.judgingStage.findUnique).mockResolvedValue({ id: 's1', state: 'FINALIZED' } as any);
            vi.mocked(prisma.finalizationSnapshot.findUnique).mockResolvedValue({ calculationRunId: 'r1' } as any);
            vi.mocked(prisma.calculationRun.findUnique).mockResolvedValue({ id: 'r1', projectResults: [] } as any);

            const result = await getPersistedCalculationAction('e1', 's1');
            expect(result.success).toBe(true);
            expect(result.run?.id).toBe('r1');
        });
    });
});
