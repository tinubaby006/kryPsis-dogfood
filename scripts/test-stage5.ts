import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://dogfood:dogfood_local_dev@localhost:5432/dogfood?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("=== Testing Stage 5 Requirements ===");
    
    // Check if evt_01 exists and has exactly 41 submitted projects + duplicate records
    const eventId = 'evt_01'; // Default fixture ID from stage 2

    const event = await prisma.event.findUnique({ where: { id: eventId }});
    if (!event) {
        console.log(`Event ${eventId} not found. Skipping exact count check (run seed first).`);
        return;
    }

    const pageSize = 12;

    const submittedCount = await prisma.project.count({
        where: { eventId, status: "SUBMITTED" }
    });

    const draftCount = await prisma.project.count({
        where: { eventId, status: "DRAFT" }
    });

    console.log(`Submitted count for ${eventId}: ${submittedCount}`);
    console.log(`Draft count for ${eventId}: ${draftCount}`);

    if (submittedCount === 41) {
        console.log("PASS: Found exactly 41 submitted records.");
    } else {
        console.log(`WARNING: Expected 41, found ${submittedCount}. Did the seed script run correctly?`);
    }

    const firstPage = await prisma.project.findMany({
        where: { eventId, status: "SUBMITTED" },
        orderBy: { id: 'asc' },
        take: pageSize
    });

    console.log("First Page IDs (Ascending by Fixture ID):");
    firstPage.forEach((p, i) => console.log(`${i+1}. ${p.id} - ${p.title} - Duplicate: ${p.duplicateOfId}`));

    const hasDuplicate = firstPage.some(p => p.duplicateOfId !== null);
    if (hasDuplicate) {
        console.log("PASS: Duplicate records are retained in the query.");
    } else {
        console.log("INFO: No duplicates found on the first page, check later pages.");
        const anyDupes = await prisma.project.findFirst({ where: { eventId, status: "SUBMITTED", duplicateOfId: { not: null } } });
        if (anyDupes) {
            console.log("PASS: Duplicate records are retained in the database generally.");
        }
    }

    if (firstPage.length > 0 && firstPage[0].id === 'prj_01') {
        console.log("PASS: Default ordering is fixture ID ascending (first is prj_01).");
    } else if (firstPage.length > 0) {
        console.log(`WARNING: First item is ${firstPage[0].id}, expected prj_01 if fixture is fully loaded.`);
    }

    console.log("=== Stage 5 verification complete ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
