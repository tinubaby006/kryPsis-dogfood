import { describe, it, expect } from 'vitest';
import { calculateWeightedWLS } from '../lib/judging/calculation';

describe('calculateWeightedWLS', () => {
    const defaultR = 2;

    it('raw score72; bias toy +10/-10 and means70/50', () => {
        // Two projects p1 and p2, two judges j1 and j2.
        // j1 is tough (bias -10), j2 is lenient (bias +10).
        // p1 true mean 70, p2 true mean 50.
        // j1 gives p1 60 (70-10), gives p2 40 (50-10).
        // j2 gives p1 80 (70+10), gives p2 60 (50+10).
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 60 },
            { projectId: 'p1', judgeId: 'j2', rawScore: 80 },
            { projectId: 'p2', judgeId: 'j1', rawScore: 40 },
            { projectId: 'p2', judgeId: 'j2', rawScore: 60 },
        ];
        const judges = ['j1', 'j2'];
        const projects = ['p1', 'p2'];
        const stageProjects = [{projectId: 'p1'}, {projectId: 'p2'}];

        const res = calculateWeightedWLS(reviews, judges, projects, stageProjects, 2);
        
        expect(res.status).toBe('SUCCESS');
        expect(res.isConnected).toBe(true);

        const p1Res = res.results.find(r => r.projectId === 'p1');
        const p2Res = res.results.find(r => r.projectId === 'p2');
        
        expect(p1Res?.normalizedMean).toBeCloseTo(70, 4);
        expect(p2Res?.normalizedMean).toBeCloseTo(50, 4);

        const j1Cal = res.calibrations.find(c => c.judgeUserId === 'j1');
        const j2Cal = res.calibrations.find(c => c.judgeUserId === 'j2');
        expect(j1Cal?.offset).toBeCloseTo(-10, 4);
        expect(j2Cal?.offset).toBeCloseTo(10, 4);
    });

    it('disconnected unsupported', () => {
        // j1 reviews p1, p2. j2 reviews p3, p4. No overlap.
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 60 },
            { projectId: 'p2', judgeId: 'j1', rawScore: 80 },
            { projectId: 'p3', judgeId: 'j2', rawScore: 40 },
            { projectId: 'p4', judgeId: 'j2', rawScore: 60 },
        ];
        const res = calculateWeightedWLS(reviews, ['j1', 'j2'], ['p1', 'p2', 'p3', 'p4'], [{projectId: 'p1'}, {projectId: 'p2'}, {projectId: 'p3'}, {projectId: 'p4'}], 1);
        expect(res.status).toBe('UNSUPPORTED');
        expect(res.isConnected).toBe(false);
    });

    it('zero-review project', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 60 },
            { projectId: 'p1', judgeId: 'j2', rawScore: 80 },
        ];
        // p2 has 0 reviews, requiring R=2
        const res = calculateWeightedWLS(reviews, ['j1', 'j2'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 2);
        expect(res.status).toBe('INCOMPLETE_EVIDENCE');
    });

    it('uneven m', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 60 },
            { projectId: 'p1', judgeId: 'j2', rawScore: 80 },
            { projectId: 'p2', judgeId: 'j1', rawScore: 60 },
            // p2 only has 1 review, requiring R=1 so it passes
        ];
        const res = calculateWeightedWLS(reviews, ['j1', 'j2'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 1);
        expect(res.status).toBe('SUCCESS');
        
        const p1Res = res.results.find(r => r.projectId === 'p1');
        const p2Res = res.results.find(r => r.projectId === 'p2');
        expect(p1Res?.reviewCount).toBe(2);
        expect(p2Res?.reviewCount).toBe(1);
    });

    it('m1 SD null', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 60 },
            { projectId: 'p2', judgeId: 'j1', rawScore: 60 },
        ];
        const res = calculateWeightedWLS(reviews, ['j1'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 1);
        expect(res.status).toBe('SUCCESS');
        const p1Res = res.results.find(r => r.projectId === 'p1');
        expect(p1Res?.sd).toBeNull();
    });

    it('means101 vs100.5 retain order', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 101 }, // Unclamped can go above 100 via biases, but here raw is 101
            { projectId: 'p2', judgeId: 'j1', rawScore: 100.5 },
        ];
        const res = calculateWeightedWLS(reviews, ['j1'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 1);
        expect(res.status).toBe('SUCCESS');
        
        const p1Res = res.results.find(r => r.projectId === 'p1');
        const p2Res = res.results.find(r => r.projectId === 'p2');
        
        expect(p1Res?.normalizedMean).toBeCloseTo(101);
        expect(p1Res?.displayedMean).toBe(100);
        
        expect(p2Res?.normalizedMean).toBeCloseTo(100.5);
        expect(p2Res?.displayedMean).toBe(100);
        
        // p1 should rank higher than p2
        expect((p1Res as any).rank).toBeLessThan((p2Res as any).rank);
    });

    it('ties deterministic', () => {
        const reviews = [
            { projectId: 'pA', judgeId: 'j1', rawScore: 50 },
            { projectId: 'pB', judgeId: 'j1', rawScore: 50 },
        ];
        // pA and pB have exact same normalized and raw mean
        const res = calculateWeightedWLS(reviews, ['j1'], ['pA', 'pB'], [{projectId: 'pA'}, {projectId: 'pB'}], 1);
        
        const res2 = calculateWeightedWLS(reviews.slice().reverse(), ['j1'], ['pB', 'pA'], [{projectId: 'pA'}, {projectId: 'pB'}], 1);
        
        const pARank1 = (res.results.find(r => r.projectId === 'pA') as any).rank;
        const pARank2 = (res2.results.find(r => r.projectId === 'pA') as any).rank;
        
        expect(pARank1).toBe(pARank2);
        
        // They should not have the same rank as each other
        const pBRank1 = (res.results.find(r => r.projectId === 'pB') as any).rank;
        expect(pARank1).not.toBe(pBRank1);
    });

    it('exact R', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'j1', rawScore: 50 },
            { projectId: 'p1', judgeId: 'j2', rawScore: 50 },
        ];
        const res = calculateWeightedWLS(reviews, ['j1', 'j2'], ['p1'], [{projectId: 'p1'}], 2);
        expect(res.status).toBe('SUCCESS');
    });
});
