import { calculateWLS } from "../lib/judging/calculation";

function assertApprox(a: number, b: number, msg: string) {
    if (Math.abs(a - b) > 1e-4) throw new Error(`${msg}: Expected ${b}, got ${a}`);
}

function runTests() {
    console.log("Running C5 Score Calculation Tests...\n");

    // Test 1: +10/-10 biases -> 70/50 results. 
    // True score = 60. Judge 1 biases +10 (scores 70). Judge 2 biases -10 (scores 50).
    const t1_reviews = [
        { projectId: "P1", judgeId: "J1", rawScore: 70 },
        { projectId: "P1", judgeId: "J2", rawScore: 50 }
    ];
    const t1 = calculateWLS(t1_reviews, ["J1", "J2"], ["P1"]);
    assertApprox(t1.results[0].normalizedMean, 60, "T1 Normalized Mean");
    assertApprox(t1.calibrations.find(c => c.judgeUserId === "J1")!.offset, 10, "T1 Judge 1 Bias");
    assertApprox(t1.calibrations.find(c => c.judgeUserId === "J2")!.offset, -10, "T1 Judge 2 Bias");
    console.log("✓ T1: Bias calibration correctly normalizes offset.");

    // Test 2: Disconnected graph fallback
    const t2_reviews = [
        { projectId: "P1", judgeId: "J1", rawScore: 80 },
        { projectId: "P2", judgeId: "J2", rawScore: 90 }
    ];
    const t2 = calculateWLS(t2_reviews, ["J1", "J2"], ["P1", "P2"]);
    if (t2.status !== "DISCONNECTED_FALLBACK") throw new Error("Expected DISCONNECTED_FALLBACK");
    assertApprox(t2.calibrations[0].offset, 0, "T2 fallback zero-bias");
    assertApprox(t2.results.find(r => r.projectId === "P1")!.normalizedMean, 80, "T2 P1 mean");
    console.log("✓ T2: Disconnected graph falls back safely without false calibration.");

    // Test 3: Uneven m (one project has 2 reviews, one has 1)
    const t3_reviews = [
        { projectId: "P1", judgeId: "J1", rawScore: 50 },
        { projectId: "P1", judgeId: "J2", rawScore: 70 }, // P1 raw mean = 60
        { projectId: "P2", judgeId: "J1", rawScore: 60 }  // P2 raw mean = 60
    ];
    // J2 tends to score 20 points higher than J1 based on P1. So J1 bias = -10, J2 bias = +10.
    // P2 true score = 60 - J1 bias = 60 - (-10) = 70.
    const t3 = calculateWLS(t3_reviews, ["J1", "J2"], ["P1", "P2"]);
    assertApprox(t3.results.find(r => r.projectId === "P2")!.normalizedMean, 70, "T3 P2 calibrated score");
    assertApprox(t3.results.find(r => r.projectId === "P2")!.reviewCount, 1, "T3 P2 review count");
    if (t3.results.find(r => r.projectId === "P2")!.sd !== null) throw new Error("T3 SD for m=1 must be null");
    console.log("✓ T3: Uneven m scales correctly. SD for m=1 is null.");

    // Test 4: Clamping only after aggregation
    const t4_reviews = [
        { projectId: "P1", judgeId: "J1", rawScore: 95 },
        { projectId: "P1", judgeId: "J2", rawScore: 95 },
        { projectId: "P2", judgeId: "J2", rawScore: 95 }
    ];
    // If J2 was somehow biased -10, P2 could get 105, which clamps to 100.
    // Let's force an extreme bias.
    const t4b_reviews = [
        { projectId: "P1", judgeId: "J1", rawScore: 100 },
        { projectId: "P1", judgeId: "J2", rawScore: 0 },
        { projectId: "P2", judgeId: "J2", rawScore: 100 }
    ];
    // J1 biases +50, J2 biases -50.
    // P2 raw = 100. True score = 100 - (-50) = 150. Clamps to 100.
    const t4 = calculateWLS(t4b_reviews, ["J1", "J2"], ["P1", "P2"]);
    assertApprox(t4.results.find(r => r.projectId === "P2")!.normalizedMean, 100, "T4 P2 clamped score");
    console.log("✓ T4: Out of bounds scores clamp only after aggregation to [0,100].");

    // Test 5: Deterministic Ties
    const t5_reviews = [
        { projectId: "B_Proj", judgeId: "J1", rawScore: 50 },
        { projectId: "A_Proj", judgeId: "J1", rawScore: 50 }
    ];
    const t5 = calculateWLS(t5_reviews, ["J1"], ["A_Proj", "B_Proj"]);
    if (t5.results[0].projectId !== "A_Proj") throw new Error("T5 Deterministic tie failed, expected A_Proj first.");
    console.log("✓ T5: Exact ties broken deterministically by ID.");

    console.log("\nAll C5 Math tests passed successfully!");
}

runTests();
