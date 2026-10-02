import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'tomas.varga@example.org';
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User:', user);
    if (user) {
        const roles = await prisma.eventRole.findMany({ where: { userId: user.id } });
        console.log('Roles:', roles);
        const reviews = await prisma.review.findMany({ where: { judgeUserId: user.id } });
        console.log('Reviews:', reviews.length);
        const allReviews = await prisma.review.count();
        console.log('All Reviews count:', allReviews);
    }
}
main().finally(() => prisma.$disconnect());
