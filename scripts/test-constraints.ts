import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up database...");
  await prisma.project.deleteMany();
  await prisma.team.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  console.log("Setting up test data...");
  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@test.com" }
  });

  const event1 = await prisma.event.create({
    data: {
      slug: "event-1",
      name: "Event 1",
      submissionsCloseAt: new Date(Date.now() + 100000),
      createdById: admin.id
    }
  });

  const event2 = await prisma.event.create({
    data: {
      slug: "event-2",
      name: "Event 2",
      submissionsCloseAt: new Date(Date.now() + 100000),
      createdById: admin.id
    }
  });

  const teamE1 = await prisma.team.create({
    data: { name: "Team E1", eventId: event1.id, createdById: admin.id }
  });

  console.log("1. Testing cross-event FK rejection...");
  try {
    // Try to create a project in event2, but linking to teamE1 (which belongs to event1)
    await prisma.project.create({
      data: {
        eventId: event2.id,
        teamId: teamE1.id,
        status: "DRAFT",
        source: "LIVE"
      }
    });
    console.error("FAIL: Cross-event FK (project.eventId != team.eventId) was not rejected!");
    process.exit(1);
  } catch (error: any) {
    if (error.message.includes("Foreign key constraint violated on the constraint: `Project_teamId_eventId_fkey`")) {
      console.log("PASS: Cross-event FK rejected as expected.");
    } else {
      console.error("FAIL: Unexpected error message:", error.message);
      process.exit(1);
    }
  }

  console.log("2. Testing duplicate-permitted project inserts...");
  const p1 = await prisma.project.create({
    data: {
      id: "prj_07",
      eventId: event1.id,
      teamId: teamE1.id,
      title: "Dry Harbour",
      status: "SUBMITTED",
      source: "FIXTURE"
    }
  });
  const p2 = await prisma.project.create({
    data: {
      id: "prj_41",
      eventId: event1.id,
      teamId: teamE1.id,
      title: "Dry Harbour",
      duplicateOfId: "prj_07",
      status: "SUBMITTED",
      source: "FIXTURE"
    }
  });
  console.log("PASS: Duplicate projects inserted successfully without unique-constraint rejection.", { p1: p1.id, p2: p2.id });

  console.log("All constraint tests passed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
