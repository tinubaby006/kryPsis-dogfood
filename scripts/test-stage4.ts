import { PrismaClient, ProjectStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { upsertProjectInternal } from '../app/actions/projects';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://dogfood:dogfood_local_dev@localhost:5432/dogfood?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("=== Testing Stage 4 Requirements ===");
    
    const admin = await prisma.user.findFirst({ where: { email: "platform_admin@dogfood.local" }});
    if (!admin) throw new Error("Admin not found");

    // Create a fresh open event for testing open success and boundaries
    const eventOpen = await prisma.event.create({
        data: {
            slug: "test-event-open-" + Date.now(),
            name: "Test Open Event",
            submissionsCloseAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hr future
            visibility: "PUBLIC",
            createdById: admin.id
        }
    });

    const eventClosed = await prisma.event.create({
        data: {
            slug: "test-event-closed-" + Date.now(),
            name: "Test Closed Event",
            submissionsCloseAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hr past
            visibility: "PUBLIC",
            createdById: admin.id
        }
    });

    const user = await prisma.user.create({
        data: {
            email: "test_stage4_" + Date.now() + "@example.com",
            name: "Stage 4 Tester"
        }
    });

    const otherUser = await prisma.user.create({
        data: {
            email: "other_stage4_" + Date.now() + "@example.com",
            name: "Other Tester"
        }
    });

    const teamOpen = await prisma.team.create({
        data: { eventId: eventOpen.id, name: "Team Open", createdById: user.id }
    });
    await prisma.teamMember.create({ data: { teamId: teamOpen.id, userId: user.id, eventId: eventOpen.id, role: "OWNER" }});

    const teamClosed = await prisma.team.create({
        data: { eventId: eventClosed.id, name: "Team Closed", createdById: user.id }
    });
    await prisma.teamMember.create({ data: { teamId: teamClosed.id, userId: user.id, eventId: eventClosed.id, role: "OWNER" }});

    const track = await prisma.track.create({
        data: { eventId: eventOpen.id, name: "AI Track", sortOrder: 0 }
    });
    const customQ = await prisma.customQuestion.create({
        data: { eventId: eventOpen.id, key: "github", label: "GitHub", type: "TEXT", required: true, sortOrder: 0 }
    });

    console.log("Testing closed event failure...");
    const resClosed = await upsertProjectInternal({
        eventId: eventClosed.id,
        teamId: teamClosed.id,
        title: "Too Late",
        summary: "",
        description: "",
        techTags: [],
        status: "DRAFT",
        version: 1,
        assets: [],
        answers: []
    }, user.id);
    if (resClosed.error === "409 EVENT_CLOSED") {
        console.log("PASS: Closed fixture event POST returned 409 EVENT_CLOSED before completeness validation.");
    } else {
        console.error("FAIL: Did not get 409 EVENT_CLOSED", resClosed);
        process.exit(1);
    }

    // 2. Open Success
    console.log("Testing open event success (DRAFT)...");
    const resOpen = await upsertProjectInternal({
        eventId: eventOpen.id,
        teamId: teamOpen.id,
        title: "Draft Project",
        summary: "Sum",
        description: "Desc",
        techTags: ["react"],
        status: "DRAFT",
        version: 1,
        assets: [],
        answers: [] // required missing, but it's a draft
    }, user.id);
    if (resOpen.success) {
        console.log("PASS: Open demo submissions succeed (DRAFT saved).");
    } else {
        console.error("FAIL: Open draft save failed", resOpen);
        process.exit(1);
    }

    const projectId = resOpen.project.id;

    // 3. Completeness Validation (SUBMITTED)
    console.log("Testing completeness validation (SUBMITTED)...");
    const resSubmitIncomplete = await upsertProjectInternal({
        projectId,
        eventId: eventOpen.id,
        teamId: teamOpen.id,
        title: "Draft Project",
        summary: "Sum",
        description: "Desc",
        techTags: ["react"],
        status: "SUBMITTED",
        version: 1, // version incremented from 1
        assets: [],
        answers: [] // Still missing required answer
    }, user.id);
    if (!resSubmitIncomplete.success && resSubmitIncomplete.error?.includes("Required question")) {
        console.log("PASS: Completeness validation enforced on SUBMITTED status.");
    } else {
        console.error("FAIL: Completeness validation failed to block submission.", resSubmitIncomplete);
        process.exit(1);
    }

    // 4. Stale Edits (Version conflict)
    console.log("Testing stale edits...");
    const resStale = await upsertProjectInternal({
        projectId,
        eventId: eventOpen.id,
        teamId: teamOpen.id,
        title: "Stale Edit",
        summary: "Sum",
        description: "Desc",
        techTags: ["react"],
        status: "DRAFT",
        version: 0, // Current version in DB is 1 because we saved it earlier? Wait, the DB version became 2. If we pass 1, it should fail.
        assets: [],
        answers: []
    }, user.id);
    if (!resStale.success && resStale.error?.includes("409 CONFLICT")) {
        console.log("PASS: Stale edits correctly rejected via version-based conflict handling.");
    } else {
        console.error("FAIL: Stale edit not caught.", resStale);
        process.exit(1);
    }

    // 5. Cross-Team Access
    console.log("Testing cross-team access denial...");
    const resCrossTeam = await upsertProjectInternal({
        projectId,
        eventId: eventOpen.id,
        teamId: teamOpen.id,
        title: "Hacked",
        summary: "",
        description: "",
        techTags: [],
        status: "DRAFT",
        version: 1,
        assets: [],
        answers: []
    }, otherUser.id);
    if (!resCrossTeam.success && resCrossTeam.error?.includes("Forbidden")) {
        console.log("PASS: Cross-team access denied.");
    } else {
        console.error("FAIL: Cross-team access allowed.", resCrossTeam);
        process.exit(1);
    }

    console.log("=== All Stage 4 verifications passed ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
