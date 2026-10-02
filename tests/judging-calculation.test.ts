import { describe, it, expect } from 'vitest';
import { pairOverlapWLS_v3 } from '../lib/judging/calculation';

describe('pairOverlapWLS_v3', () => {
    it('reference uneven dataset', () => {
        // | Project | Judge a | Judge b | Judge c |
        // | p1      | 60      | 80      | missing |
        // | p2      | 40      | 50      | 90      |
        // | p3      | 20      | missing | 70      |
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 60 },
            { projectId: 'p1', judgeId: 'b', rawScore: 80 },
            { projectId: 'p2', judgeId: 'a', rawScore: 40 },
            { projectId: 'p2', judgeId: 'b', rawScore: 50 },
            { projectId: 'p2', judgeId: 'c', rawScore: 90 },
            { projectId: 'p3', judgeId: 'a', rawScore: 20 },
            { projectId: 'p3', judgeId: 'c', rawScore: 70 },
        ];
        const judges = ['a', 'b', 'c'];
        const projects = ['p1', 'p2', 'p3'];
        const stageProjects = [{projectId: 'p1'}, {projectId: 'p2'}, {projectId: 'p3'}];

        const res = pairOverlapWLS_v3(reviews, judges, projects, stageProjects, 2, 'FIXTURE');
        
        expect(res.status).toBe('SUCCESS');
        expect(res.isConnected).toBe(true);

        const pa = res.calibrations.find(c => c.judgeUserId === 'a')!;
        const pb = res.calibrations.find(c => c.judgeUserId === 'b')!;
        const pc = res.calibrations.find(c => c.judgeUserId === 'c')!;
        expect(pa.offset).toBeCloseTo(-21.66666666666667, 6);
        expect(pb.offset).toBeCloseTo(-7.916666666666668, 6);
        expect(pc.offset).toBeCloseTo(29.58333333333333, 6);

        const p1 = res.results.find(r => r.projectId === 'p1')!;
        const p2 = res.results.find(r => r.projectId === 'p2')!;
        const p3 = res.results.find(r => r.projectId === 'p3')!;
        
        expect(p1.normalizedMean).toBeCloseTo(84.79166666666667, 6);
        expect(p2.normalizedMean).toBeCloseTo(60, 6);
        expect(p3.normalizedMean).toBeCloseTo(41.04166666666667, 6);

        expect(p1.sd).toBeCloseTo(4.419417382415922, 6);
        expect(p2.sd).toBeCloseTo(1.9094065395649333, 6);
        expect(p3.sd).toBeCloseTo(0.8838834764831844, 6);
    });

    it('disconnected graph returns UNSUPPORTED', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 60 },
            { projectId: 'p2', judgeId: 'a', rawScore: 80 },
            { projectId: 'p3', judgeId: 'b', rawScore: 40 },
            { projectId: 'p4', judgeId: 'b', rawScore: 60 },
        ];
        const res = pairOverlapWLS_v3(reviews, ['a', 'b'], ['p1', 'p2', 'p3', 'p4'], [{projectId: 'p1'}, {projectId: 'p2'}, {projectId: 'p3'}, {projectId: 'p4'}], 1, 'FIXTURE');
        expect(res.status).toBe('UNSUPPORTED');
        expect(res.isConnected).toBe(false);
    });

    it('no evidence returns INCOMPLETE_EVIDENCE', () => {
        const res = pairOverlapWLS_v3([], ['a'], ['p1'], [{projectId: 'p1'}], 1, 'FIXTURE');
        expect(res.status).toBe('INCOMPLETE_EVIDENCE');
    });

    it('single judge returns SINGLE_JUDGE_UNCALIBRATED', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 60 },
            { projectId: 'p2', judgeId: 'a', rawScore: 80 }
        ];
        const res = pairOverlapWLS_v3(reviews, ['a'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 1, 'FIXTURE');
        expect(res.status).toBe('SINGLE_JUDGE_UNCALIBRATED');
        expect(res.calibrations.find(c => c.judgeUserId === 'a')!.offset).toBe(0);
        expect(res.results.find(r => r.projectId === 'p1')!.normalizedMean).toBe(60);
    });

    it('exact R coverage requirement for LIVE', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 50 },
            { projectId: 'p1', judgeId: 'b', rawScore: 50 },
            { projectId: 'p2', judgeId: 'a', rawScore: 50 },
        ];
        const res = pairOverlapWLS_v3(reviews, ['a', 'b'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 2, 'LIVE');
        expect(res.status).toBe('INCOMPLETE_EVIDENCE');
        expect(res.reason).toMatch(/Project p2 has 1 reviews, exactly 2 required/);
    });

    it('excess R returns INCOMPLETE_EVIDENCE for LIVE', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 50 },
            { projectId: 'p1', judgeId: 'b', rawScore: 50 },
            { projectId: 'p1', judgeId: 'c', rawScore: 50 },
        ];
        const res = pairOverlapWLS_v3(reviews, ['a', 'b', 'c'], ['p1'], [{projectId: 'p1'}], 2, 'LIVE');
        expect(res.status).toBe('INCOMPLETE_EVIDENCE');
        expect(res.reason).toMatch(/Project p1 has 3 reviews, exactly 2 required/);
    });

    it('one review SD is null, identical reviews SD is 0', () => {
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 50 },
            { projectId: 'p2', judgeId: 'a', rawScore: 60 },
            { projectId: 'p2', judgeId: 'b', rawScore: 60 },
        ];
        // For p2, if judge 'a' and 'b' have exactly 0 bias, their calibrated scores are 60,60 so variance is 0.
        const res = pairOverlapWLS_v3(reviews, ['a', 'b'], ['p1', 'p2'], [{projectId: 'p1'}, {projectId: 'p2'}], 1, 'FIXTURE');
        
        const p1 = res.results.find(r => r.projectId === 'p1')!;
        const p2 = res.results.find(r => r.projectId === 'p2')!;
        
        expect(p1.sd).toBeNull();
        expect(p2.sd).toBe(0);
    });

    it('normalized means above 100 rank before display clipping', () => {
        // Judge b is very lenient, Judge a is normal
        const reviews = [
            { projectId: 'p1', judgeId: 'a', rawScore: 80 },
            { projectId: 'p1', judgeId: 'b', rawScore: 100 },
            
            { projectId: 'p2', judgeId: 'b', rawScore: 100 }, // b gave 100, but a didn't review. Since b is lenient, b's bias is positive. So calibrated score is < 100. Wait, actually if b is lenient, p2's raw is 100, offset is say 10, calibrated is 90.
            
            // Wait, let's just make the raw score manually > 100 (though validation usually prevents it, calculation should handle it correctly)
            { projectId: 'p3', judgeId: 'a', rawScore: 105 },
            { projectId: 'p4', judgeId: 'a', rawScore: 102 },
        ];
        const res = pairOverlapWLS_v3(reviews, ['a', 'b'], ['p1', 'p2', 'p3', 'p4'], [{projectId: 'p1'}, {projectId: 'p2'}, {projectId: 'p3'}, {projectId: 'p4'}], 1, 'FIXTURE');
        
        const p3 = res.results.find(r => r.projectId === 'p3')!;
        const p4 = res.results.find(r => r.projectId === 'p4')!;
        
        expect(p3.displayedMean).toBe(100);
        expect(p4.displayedMean).toBe(100);
        
        expect(p3.normalizedMean).toBeGreaterThan(100);
        expect(p4.normalizedMean).toBeGreaterThan(100);
        
        // p3 should be ranked better than p4
        expect((p3 as any).rank).toBeLessThan((p4 as any).rank);
    });

    it('exact ties are broken deterministically using tie-v3 hash', () => {
        const reviews = [
            { projectId: 'A', judgeId: 'a', rawScore: 50 },
            { projectId: 'B', judgeId: 'a', rawScore: 50 },
        ];
        const res = pairOverlapWLS_v3(reviews, ['a'], ['A', 'B'], [{projectId: 'A'}, {projectId: 'B'}], 1, 'FIXTURE');
        
        const res2 = pairOverlapWLS_v3(reviews.slice().reverse(), ['a'], ['B', 'A'], [{projectId: 'B'}, {projectId: 'A'}], 1, 'FIXTURE');
        
        const aRank1 = (res.results.find(r => r.projectId === 'A') as any).rank;
        const aRank2 = (res2.results.find(r => r.projectId === 'A') as any).rank;
        
        expect(aRank1).toBe(aRank2);
        
        const bRank1 = (res.results.find(r => r.projectId === 'B') as any).rank;
        expect(aRank1).not.toBe(bRank1);
    });
});
