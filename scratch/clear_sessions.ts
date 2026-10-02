import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Invalidating old sessions...");
    const result = await prisma.session.deleteMany({});
    console.log(`Deleted ${result.count} sessions.`);
}

main().finally(async () => await prisma.$disconnect());
