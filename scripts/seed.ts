import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fixturesPath = path.join(process.cwd(), 'docs', 'official', 'fixtures.json');
  const rawFixtures = fs.readFileSync(fixturesPath, 'utf8');
  const fixturesHash = crypto.createHash('sha256').update(rawFixtures).digest('hex');
  const data = JSON.parse(rawFixtures);

  console.log("Checking import idempotency...");
  const existingImport = await prisma.fixtureImport.findUnique({
    where: { sourceName_sourceSha256: { sourceName: 'fixtures.json', sourceSha256: fixturesHash } }
  });

  if (existingImport) {
    console.warn(`WARNING: Fixture fixtures.json with hash ${fixturesHash} has already been imported on ${existingImport.importedAt.toISOString()}. Proceeding with non-destructive UPSERTs to ensure idempotency...`);
  }

  // Pre-calculate standard dev password hash to avoid bcrypt overhead in loop
  console.log("Preparing users and authentication...");
  // Use Better Auth's expected hash format for 'dogfood_local_dev'
  const devPasswordHash = "80511828d0b8ea8b45ce1b78f3337900:2b50f3cf8a51fe3b217a3e9d41b5bdac60939470d7220b3480fd0160c3181f56880eb98fc65c5ce470767d33a651426c97812259afe67b15da7de12cc89d3fbc";
  
  // Extract all distinct emails
  const emails = new Set<string>();
  emails.add("platform_admin@dogfood.local"); // Admin
  data.judges.forEach((j: any) => emails.add(j.email));
  data.teams.forEach((t: any) => {
      t.members.forEach((m: string) => emails.add(m));
  });

  const usersMap = new Map<string, string>(); // email -> id

  await prisma.$transaction(async (tx) => {
      // 1. Upsert Users
      for (const email of emails) {
          const name = email.split('@')[0];
          const isPlatformAdmin = email === "platform_admin@dogfood.local";
          
          let user = await tx.user.findUnique({ where: { email } });
          if (!user) {
              user = await tx.user.create({
                  data: {
                      name,
                      email,
                      emailVerified: true,
                      isPlatformAdmin,
                      canCreateEvents: isPlatformAdmin
                  }
              });
              // Create Better Auth account credential manually to bypass API requirements in seed
              await tx.account.create({
                  data: {
                      id: crypto.randomUUID(),
                      accountId: user.id,
                      providerId: "credential",
                      userId: user.id,
                      password: devPasswordHash,
                  }
              });
          }
          usersMap.set(email, user.id);
      }

      // 2. Demo Event
      console.log("Upserting Demo Event...");
      const adminId = usersMap.get("platform_admin@dogfood.local")!;
      await tx.event.upsert({
          where: { slug: "demo" },
          update: {},
          create: {
              slug: "demo",
              name: "Hackathon Demo",
              description: "Open demo event",
              visibility: "PUBLIC",
              submissionsCloseAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
              createdById: adminId
          }
      });

      // 3. Fixture Event
      console.log("Upserting Fixture Event...");
      const fixtureEvent = data.event;
      const eventRecord = await tx.event.upsert({
          where: { slug: fixtureEvent.id },
          update: {}, // Non-destructive update
          create: {
              id: fixtureEvent.id,
              slug: fixtureEvent.id,
              name: fixtureEvent.name,
              submissionsCloseAt: new Date(fixtureEvent.submissions_close),
              visibility: "DRAFT",
              createdById: adminId,
              fixtureSource: 'fixtures.json'
          }
      });
      const eventId = eventRecord.id;

      // 4. Tracks
      for (let i = 0; i < data.tracks.length; i++) {
          const track = data.tracks[i];
          await tx.track.upsert({
              where: { id_eventId: { id: track.id, eventId } },
              update: {},
              create: { id: track.id, eventId, name: track.name, sortOrder: i }
          });
      }

      // 5. Teams and Members
      for (const team of data.teams) {
          const creatorEmail = team.members[0]; // First member is owner
          const creatorId = usersMap.get(creatorEmail)!;
          
          await tx.team.upsert({
              where: { id_eventId: { id: team.id, eventId } },
              update: {},
              create: { id: team.id, eventId, name: team.name, createdById: creatorId }
          });

          for (let i = 0; i < team.members.length; i++) {
              const memberId = usersMap.get(team.members[i])!;
              const role = i === 0 ? "OWNER" : "MEMBER";
              await tx.teamMember.upsert({
                  where: { teamId_userId: { teamId: team.id, userId: memberId } },
                  update: {},
                  create: { eventId, teamId: team.id, userId: memberId, role }
              });
              
              // Assign PARTICIPANT role
              await tx.eventRole.upsert({
                  where: { eventId_userId: { eventId, userId: memberId } },
                  update: { role: "PARTICIPANT" },
                  create: { eventId, userId: memberId, role: "PARTICIPANT" }
              });
          }
      }

      // 6. Judges & Judge Tracks
      for (const judge of data.judges) {
          const judgeId = usersMap.get(judge.email)!;
          
          await tx.eventRole.upsert({
              where: { eventId_userId: { eventId, userId: judgeId } },
              update: { role: "JUDGE" },
              create: { eventId, userId: judgeId, role: "JUDGE" }
          });

          for (const trackId of judge.tracks) {
              await tx.judgeTrack.upsert({
                  where: { eventId_userId_trackId: { eventId, userId: judgeId, trackId } },
                  update: {},
                  create: { eventId, userId: judgeId, trackId }
              });
          }
      }

      // 7. Projects
      for (const proj of data.projects) {
          const submittedAt = proj.submitted_at ? new Date(proj.submitted_at) : null;
          // Find if this project is a duplicate
          const duplicateOf = data.projects.find((p: any) => p !== proj && p.team === proj.team && p.title === proj.title && p.id < proj.id);
          
          await tx.project.upsert({
              where: { id_eventId: { id: proj.id, eventId } },
              update: {},
              create: {
                  id: proj.id,
                  eventId,
                  teamId: proj.team,
                  trackId: proj.track || null,
                  title: proj.title,
                  summary: proj.summary,
                  repoUrl: proj.repo_url,
                  status: submittedAt ? "SUBMITTED" : "DRAFT",
                  submittedAt,
                  duplicateOfId: duplicateOf ? duplicateOf.id : null,
                  source: "FIXTURE"
              }
          });
      }

      // 8. Dynamic Criteria
      if (data.scores.length > 0) {
          const sampleScore = data.scores[0];
          const criteriaKeys = Object.keys(sampleScore.criteria);
          for (let i = 0; i < criteriaKeys.length; i++) {
              const key = criteriaKeys[i];
              await tx.criterion.upsert({
                  where: { eventId_key: { eventId, key } },
                  update: {},
                  create: { eventId, key, label: key.charAt(0).toUpperCase() + key.slice(1), sortOrder: i }
              });
          }
      }

      // 9. Reviews & Scores
      const criteriaMap = new Map<string, string>();
      const criteria = await tx.criterion.findMany({ where: { eventId } });
      for (const c of criteria) criteriaMap.set(c.key, c.id);

      const judgeIdToUserId = new Map<string, string>();
      for (const j of data.judges) judgeIdToUserId.set(j.id, usersMap.get(j.email)!);

      for (let i = 0; i < data.scores.length; i++) {
          const score = data.scores[i];
          const reviewId = `rev_${String(i + 1).padStart(3, '0')}`;
          const judgeUserId = judgeIdToUserId.get(score.judge)!;
          
          await tx.review.upsert({
              where: { eventId_judgeUserId_projectId: { eventId, judgeUserId, projectId: score.project } },
              update: {},
              create: {
                  id: reviewId,
                  eventId,
                  judgeUserId,
                  projectId: score.project,
                  comment: score.comment || "",
                  source: "FIXTURE"
              }
          });

          const reviewRecord = await tx.review.findUnique({
              where: { eventId_judgeUserId_projectId: { eventId, judgeUserId, projectId: score.project } }
          });

          const criteriaKeys = Object.keys(score.criteria);
          for (const key of criteriaKeys) {
              const criterionId = criteriaMap.get(key)!;
              const value = score.criteria[key];
              await tx.criterionScore.upsert({
                  where: { reviewId_criterionId: { reviewId: reviewRecord!.id, criterionId } },
                  update: {},
                  create: { eventId, reviewId: reviewRecord!.id, criterionId, value }
              });
          }
      }

      // 10. T2 Demo Event Dataset
      console.log("Upserting T2 Demo Dataset...");
      const demoEventRecord = await tx.event.findUnique({ where: { slug: "demo" } });
      const demoEventId = demoEventRecord!.id;
      const demoJudgeEmail = "demo_judge@dogfood.local";
      
      let demoJudge = await tx.user.findUnique({ where: { email: demoJudgeEmail } });
      if (!demoJudge) {
          demoJudge = await tx.user.create({
              data: {
                  name: "Demo Judge",
                  email: demoJudgeEmail,
                  emailVerified: true
              }
          });
      }

      await tx.team.upsert({
          where: { id_eventId: { id: "demo_team_1", eventId: demoEventId } },
          update: {},
          create: { id: "demo_team_1", eventId: demoEventId, name: "Demo Team", createdById: adminId }
      });
      
      await tx.project.upsert({
          where: { id_eventId: { id: "demo_proj_1", eventId: demoEventId } },
          update: {},
          create: {
              id: "demo_proj_1", eventId: demoEventId, teamId: "demo_team_1",
              title: "Demo Project", status: "SUBMITTED", source: "LIVE"
          }
      });

      const demoStage = await tx.judgingStage.upsert({
          where: { eventId_name: { eventId: demoEventId, name: "Demo Round 1" } },
          update: {},
          create: { eventId: demoEventId, name: "Demo Round 1", state: "OPEN", scopeKey: demoEventId }
      });

      // ONLY create if missing to avoid destructively deleting referenced rubric versions
      let demoRubric = await tx.rubricVersion.findFirst({ where: { stageId: demoStage.id } });
      if (!demoRubric) {
          demoRubric = await tx.rubricVersion.create({
              data: { stageId: demoStage.id, versionHash: "v1" }
          });
          
          await tx.rubricCriterion.create({
              data: { rubricVersionId: demoRubric.id, key: "demo_ux", title: "UX", weightBasisPts: 10000, maxScore: 5, sortOrder: 0 }
          });
      }

      await tx.stageProject.upsert({
          where: { stageId_projectId: { stageId: demoStage.id, projectId: "demo_proj_1" } },
          update: {},
          create: { stageId: demoStage.id, projectId: "demo_proj_1", eventId: demoEventId, versionSnapshot: 1 }
      });

      await tx.stageJudge.upsert({
          where: { stageId_judgeUserId: { stageId: demoStage.id, judgeUserId: demoJudge.id } },
          update: {},
          create: { stageId: demoStage.id, judgeUserId: demoJudge.id }
      });
      
      // Ensure demo judge has JUDGE role for event
      await tx.eventRole.upsert({
          where: { eventId_userId: { eventId: demoEventId, userId: demoJudge.id } },
          update: { role: "JUDGE" },
          create: { eventId: demoEventId, userId: demoJudge.id, role: "JUDGE" }
      });

      // 11. Finalize Import Status (Inside Transaction)
      if (!existingImport) {
          await tx.fixtureImport.create({
              data: {
                  sourceName: 'fixtures.json',
                  sourceSha256: fixturesHash,
                  counts: {
                      tracks: data.tracks.length,
                      judges: data.judges.length,
                      teams: data.teams.length,
                      projects: data.projects.length,
                      scores: data.scores.length
                  },
                  rawPayload: {}
              }
          });
      }

  });

  console.log("Database seeded successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
