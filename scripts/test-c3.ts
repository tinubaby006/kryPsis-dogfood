import { prisma } from "../lib/db";
import { generateAssignmentPreview } from "../lib/judging/assignment";

async function runTests() {
    console.log("C3 Assignment Tests");

    // We will test the algorithm properties using a mock environment or against the existing db?
    // Since we need to test connectivity, parity, disjoint sets, it's easier to mock `prisma` inside a test or just create mock records.
    // Wait, the easiest is to just use the actual generateAssignmentPreview on a dummy Stage, but mocking prisma is hard in a quick script.
    // Instead of mocking, let's create a temporary event for testing C3.

    const event = await prisma.event.create({
        data: {
            slug: `test-c3-${Date.now()}`,
            name: "C3 Test Event",
            submissionsCloseAt: new Date(),
            creator: { connect: { email: "platform_admin@dogfood.local" } }
        }
    });

    console.log(`Created test event: ${event.id}`);

    // Helper to setup a scenario
    async function setupScenario(name: string, J: number, N: number, R: number, conflicts: Array<[number, number]> = []) {
        console.log(`\n--- Scenario: ${name} (J=${J}, N=${N}, R=${R}) ---`);
        const stage = await prisma.judgingStage.create({
            data: { eventId: event.id, name, scope: "EVENT", requiredReviews: R, state: "ASSIGNING", scopeKey: event.id }
        });

        const judges = [];
        for (let i = 0; i < J; i++) {
            const u = await prisma.user.create({ data: { name: `Judge ${i}`, email: `j${i}_${Date.now()}@test.com`, emailVerified: true } });
            const sj = await prisma.stageJudge.create({ data: { stageId: stage.id, judgeUserId: u.id, isActive: true } });
            judges.push(u);
        }

        const projects = [];
        for (let i = 0; i < N; i++) {
            const t = await prisma.team.create({ data: { eventId: event.id, name: `Team ${i}`, createdById: judges[0].id } });
            const p = await prisma.project.create({ data: { eventId: event.id, teamId: t.id, title: `Proj ${i}`, status: "SUBMITTED", source: "LIVE" } });
            await prisma.stageProject.create({ data: { stageId: stage.id, projectId: p.id, eventId: event.id, versionSnapshot: 1 } });
            projects.push({ teamId: t.id, projectId: p.id });
        }

        for (const [pi, ji] of conflicts) {
            await prisma.teamMember.create({ data: { eventId: event.id, teamId: projects[pi].teamId, userId: judges[ji].id, role: "MEMBER" } });
        }

        return { stage, judges, projects };
    }

    try {
        // 1. Feasible Example
        const s1 = await setupScenario("Feasible", 4, 10, 2);
        const res1 = await generateAssignmentPreview(s1.stage.id);
        if (res1.diagnostic.status === "VALID") {
            console.log("PASS: Feasible example generated VALID assignments.");
        } else {
            console.error("FAIL: Feasible example failed:", res1.diagnostic);
        }

        // 2. Impossible Capacity Example (R > J)
        const s2 = await setupScenario("Impossible Capacity", 2, 5, 3);
        const res2 = await generateAssignmentPreview(s2.stage.id);
        if (res2.diagnostic.status === "INFEASIBLE") {
            console.log("PASS: Impossible capacity returned INFEASIBLE.");
        } else {
            console.error("FAIL: Impossible capacity did not fail correctly:", res2.diagnostic);
        }

        // 3. Eligibility-constrained impossible (Conflicts)
        // J=3, N=3, R=2. But Judge 0 is on Team 0, 1, 2. So Judge 0 can't review anything.
        // Effective J=2, which can still do R=2. Let's make Judge 0 and Judge 1 on Team 0. 
        // Then Team 0 only has Judge 2 eligible. But R=2.
        const s3 = await setupScenario("Eligibility Constrained", 3, 3, 2, [[0, 0], [0, 1]]);
        const res3 = await generateAssignmentPreview(s3.stage.id);
        if (res3.diagnostic.status === "INFEASIBLE") {
            console.log("PASS: Eligibility-constrained returned INFEASIBLE.");
        } else {
            console.error("FAIL: Eligibility constrained did not fail correctly:", res3.diagnostic);
        }

        // 4. Disconnected Graph (R=2, J=4, N=2) -> Greedy might not connect if it partitions {J0,J1}->P0 and {J2,J3}->P1
        // To force disconnection, let's just make conflicts split the bipartite graph into two components.
        // P0 only eligible for J0, J1. P1 only eligible for J2, J3.
        const s4 = await setupScenario("Disconnected Graph", 4, 2, 2, [
            [0, 2], [0, 3], // P0 conflicts with J2, J3
            [1, 0], [1, 1]  // P1 conflicts with J0, J1
        ]);
        const res4 = await generateAssignmentPreview(s4.stage.id);
        if (res4.diagnostic.status === "CONSTRUCTION_FAILED" && res4.diagnostic.reason.includes("disconnected")) {
            console.log("PASS: Disconnected graph blocked.");
        } else {
            console.error("FAIL: Disconnected graph failed incorrectly:", res4.diagnostic);
        }

        console.log("All C3 constraint tests completed!");
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.event.delete({ where: { id: event.id } }); // cleanup
    }
}

runTests();
