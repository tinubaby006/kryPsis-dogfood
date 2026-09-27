import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://dogfood:dogfood_local_dev@localhost:5432/dogfood?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: "member1_1@example.org" },
        include: { accounts: true }
    });
    console.log("Seeded User:");
    console.dir(user, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
