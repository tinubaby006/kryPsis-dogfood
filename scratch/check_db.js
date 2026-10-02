const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgres://dogfood:dogfoodpassword@localhost:5432/dogfood_db?schema=public" } } });

async function main() {
    const sessions = await prisma.session.findMany();
    console.log(`Found ${sessions.length} sessions.`);
    if (sessions.length > 0) {
        console.log(sessions.map(s => s.token).slice(0, 3));
    }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
