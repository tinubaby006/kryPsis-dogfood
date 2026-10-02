import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { importFixtureToModernStage } from '../lib/fixtures/import';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const apply = process.argv.includes('--apply');
    const fixturesPath = path.join(process.cwd(), 'docs', 'official', 'fixtures.json');
    const rawFixtures = fs.readFileSync(fixturesPath, 'utf8');
    const data = JSON.parse(rawFixtures);
    const eventId = data.event.id;

    console.log(`Starting Repair Script (Apply mode: ${apply}) for event ${eventId}`);
    
    // Find mock runs
    const mockRuns = await prisma.calculationRun.findMany({
        where: {
            stage: { eventId },
            OR: [
                { configHash: 'migrated' },
                { inputHash: 'migrated' },
                { method: 'SUCCESS' }
            ],
            invalidatedAt: null
        },
        include: { stage: true }
    });

    console.log(`Found ${mockRuns.length} candidate mock CalculationRuns.`);

    // Find legacy stage to archive (non-canonical, missing fixtureImportId)
    const legacyStages = await prisma.judgingStage.findMany({
        where: {
            eventId,
            fixtureImportId: null, // Legacy stage doesn't have the canonical projection ID
            origin: "LIVE", // Might have been created as LIVE by mistake
            archivedAt: null,
            name: { not: "Imported fixture reviews" }
        }
    });
    
    console.log(`Found ${legacyStages.length} legacy JudgingStages candidates for archival.`);

    if (apply) {
        await prisma.$transaction(async (tx) => {
            for (const run of mockRuns) {
                await tx.calculationRun.update({
                    where: { id: run.id },
                    data: {
                        invalidatedAt: new Date(),
                        invalidationReason: "Legacy mock run invalidated by repair script"
                    }
                });
                
                await tx.judgingStage.updateMany({
                    where: { id: run.stageId },
                    data: { publishedSnapshotId: null }
                });
            }

            for (const stage of legacyStages) {
                await tx.judgingStage.update({
                    where: { id: stage.id },
                    data: { archivedAt: new Date() }
                });
            }
        });

        console.log("Mock runs invalidated and legacy stages archived.");
        
        const adminEmail = "platform_admin@dogfood.local";
        const orgEmail = "assessment_organizer@dogfood.local";
        
        let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
        let org = await prisma.user.findUnique({ where: { email: orgEmail } });
        
        if (admin && org) {
            console.log("Ensuring canonical fixture projection...");
            await importFixtureToModernStage(prisma, rawFixtures, admin.id, org.id);
            
            await prisma.event.update({
                where: { id: eventId },
                data: { visibility: "PUBLIC", tracksMode: "MULTI_TRACK" }
            });
        } else {
             console.log("Could not find admin or org user to ensure fixture projection. Run db:seed first.");
        }
        console.log("Repair applied successfully.");
    } else {
        console.log("Dry run complete. Use --apply to execute changes.");
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
