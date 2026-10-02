import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { importFixtureToModernStage } from '../lib/fixtures/import';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Fixture Import', () => {
    let rawFixtures: string;
    let adminUserId: string;
    let orgUserId: string;

    beforeAll(async () => {
        const fixturesPath = path.join(process.cwd(), 'docs', 'official', 'fixtures.json');
        rawFixtures = fs.readFileSync(fixturesPath, 'utf8');

        const admin = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
        const org = await prisma.user.findFirst({ where: { email: "assessment_organizer@dogfood.local" } });
        
        if (admin && org) {
            adminUserId = admin.id;
            orgUserId = org.id;
        } else {
            throw new Error("Seed DB first to have admin and organizer users");
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should be idempotent on repeated imports', async () => {
        const stagesBefore = await prisma.judgingStage.count();
        const projectsBefore = await prisma.stageProject.count();
        const reviewsBefore = await prisma.stageReview.count();
        
        await importFixtureToModernStage(prisma, rawFixtures, adminUserId, orgUserId);
        
        const stagesAfter = await prisma.judgingStage.count();
        const projectsAfter = await prisma.stageProject.count();
        const reviewsAfter = await prisma.stageReview.count();

        expect(stagesAfter).toBe(stagesBefore);
        expect(projectsAfter).toBe(projectsBefore);
        expect(reviewsAfter).toBe(reviewsBefore);
    }, 30000);

    it('should have 126 completed assignments', async () => {
        const stage = await prisma.judgingStage.findFirst({
            where: { name: "Imported fixture reviews" }
        });
        expect(stage).toBeDefined();

        const assignments = await prisma.rubricAssignment.count({
            where: { stageId: stage!.id, status: "COMPLETED" }
        });
        expect(assignments).toBe(126);
    });

    it('should have 378 criterion scores', async () => {
        const stage = await prisma.judgingStage.findFirst({
            where: { name: "Imported fixture reviews" },
            include: { activeRubric: true }
        });

        const reviews = await prisma.stageReview.findMany({
            where: { rubricVersionId: stage!.activeRubric!.id },
            include: { scores: true }
        });

        const totalScores = reviews.reduce((acc, r) => acc + r.scores.length, 0);
        expect(totalScores).toBe(378);
    });
});
