import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function wipe() {
    console.log("Wiping database...");
    await prisma.criterionScore.deleteMany();
    await prisma.review.deleteMany();
    await prisma.criterion.deleteMany();
    await prisma.customAnswer.deleteMany();
    await prisma.projectAsset.deleteMany();
    await prisma.project.deleteMany();
    await prisma.teamInvite.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.customQuestion.deleteMany();
    await prisma.prize.deleteMany();
    await prisma.judgeTrack.deleteMany();
    await prisma.track.deleteMany();
    await prisma.eventRole.deleteMany();
    await prisma.event.deleteMany();
    await prisma.assessmentCredential.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.importIssue.deleteMany();
    await prisma.fixtureImport.deleteMany();
    console.log("Database wiped successfully.");
}

wipe().finally(() => prisma.$disconnect());
