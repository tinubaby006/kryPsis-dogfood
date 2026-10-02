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
  const fixturesPath = path.join(process.cwd(), 'docs', 'official', 'fixtures.json');
  const rawFixtures = fs.readFileSync(fixturesPath, 'utf8');

  console.log("Preparing users and authentication...");
  // Use Better Auth's expected hash format for 'dogfood_local_dev'
  const devPasswordHash = "80511828d0b8ea8b45ce1b78f3337900:2b50f3cf8a51fe3b217a3e9d41b5bdac60939470d7220b3480fd0160c3181f56880eb98fc65c5ce470767d33a651426c97812259afe67b15da7de12cc89d3fbc";

  const adminEmail = "platform_admin@dogfood.local";
  const orgEmail = "assessment_organizer@dogfood.local";

  // Pre-create admin and organizer to get their IDs
  let adminUserId = "";
  let orgUserId = "";
  
  await prisma.$transaction(async (tx) => {
      // 1. Admin
      let admin = await tx.user.findUnique({ where: { email: adminEmail } });
      if (!admin) {
          admin = await tx.user.create({
              data: { name: "Platform Admin", email: adminEmail, emailVerified: true, isPlatformAdmin: true, canCreateEvents: true }
          });
          await tx.account.create({
              data: { id: crypto.randomUUID(), accountId: admin.id, providerId: "credential", userId: admin.id, password: devPasswordHash }
          });
      }
      adminUserId = admin.id;

      // 2. Organizer (Ordinary)
      let org = await tx.user.findUnique({ where: { email: orgEmail } });
      if (!org) {
          org = await tx.user.create({
              data: { name: "Assessment Organizer", email: orgEmail, emailVerified: true, isPlatformAdmin: false, canCreateEvents: false }
          });
          await tx.account.create({
              data: { id: crypto.randomUUID(), accountId: org.id, providerId: "credential", userId: org.id, password: devPasswordHash }
          });
      }
      orgUserId = org.id;

      // Also create demo_judge
      let demoJudge = await tx.user.findUnique({ where: { email: "demo_judge@dogfood.local" } });
      if (!demoJudge) {
          demoJudge = await tx.user.create({
              data: { name: "Demo Judge", email: "demo_judge@dogfood.local", emailVerified: true }
          });
          await tx.account.create({
              data: { id: crypto.randomUUID(), accountId: demoJudge.id, providerId: "credential", userId: demoJudge.id, password: devPasswordHash }
          });
      }
  });

  console.log("Importing fixture to modern stage...");
  await importFixtureToModernStage(prisma, rawFixtures, adminUserId, orgUserId);

  console.log("Database seeded successfully.");

  console.log("Setting default password for all imported users...");
  const usersWithoutAccounts = await prisma.user.findMany({
      where: {
          accounts: { none: {} }
      }
  });

  if (usersWithoutAccounts.length > 0) {
      await prisma.account.createMany({
          data: usersWithoutAccounts.map(u => ({
              id: crypto.randomUUID(),
              accountId: u.id,
              providerId: "credential",
              userId: u.id,
              password: devPasswordHash
          }))
      });
      console.log(`Set password for ${usersWithoutAccounts.length} users.`);
  }

  console.log("Injecting hardcoded sessions for CI tests...");
  const hardcodedTokens = [
      { email: "assessment_organizer@dogfood.local", token: "8uZp2rEjrhXll4Cnk7xIs25qG7dScLn9" },
      { email: "tomas.varga@example.org", token: "qsmF51NZlEASKPcOLsVAvGopbEq2r0Pp" },
      { email: "wei.lindqvist@example.org", token: "PpH9jAgfMYuwCUHwdump3g30j66aAON4" },
      { email: "priya1@example.org", token: "UankmXEn8SSBKb4OZMJjLn1baFCqWEYZ" }
  ];

  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  for (const ht of hardcodedTokens) {
      const u = await prisma.user.findUnique({ where: { email: ht.email } });
      if (u) {
          await prisma.session.upsert({
              where: { token: ht.token },
              update: { userId: u.id, expiresAt: nextYear },
              create: {
                  id: crypto.randomUUID(),
                  token: ht.token,
                  userId: u.id,
                  expiresAt: nextYear,
                  ipAddress: "127.0.0.1",
                  userAgent: "CI/CD Test Runner"
              }
          });
      }
  }
  console.log("Hardcoded sessions injected.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
