import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // We need to output a .dogfood.toml configuration
    // The runner expects:
    // [test]
    // bearer = "df_...token..."
    // ...
    // Wait, the prompt says: "create database-verified local assessment bearer credentials with finite expiry and shared authorization; enable them only in explicit demo mode."
    // Let's create an assessment credential for the runner.
    
    console.log("Generating assessment configuration...");
    
    const adminUser = await prisma.user.findFirst({
        where: { isPlatformAdmin: true }
    });

    if (!adminUser) {
        throw new Error("No platform admin found. Run seed first.");
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const bearer = `df_${rawToken}`;
    const tokenHash = crypto.createHash('sha256').update(bearer).digest('hex');

    // Store in AssessmentCredential
    await prisma.assessmentCredential.create({
        data: {
            userId: adminUser.id,
            tokenHash,
            label: "Local CLI Runner Token",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours finite expiry
        }
    });

    console.log("--- ACTUAL HEADERS ---");
    console.log(`Authorization: Bearer ${bearer}`);
    console.log("----------------------");

    const tomlContent = `
[test]
bearer = "${bearer}"
endpoint = "http://127.0.0.1:3000"
`;

    fs.writeFileSync(path.join(process.cwd(), '.dogfood.toml'), tomlContent.trim());
    console.log(".dogfood.toml written successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
