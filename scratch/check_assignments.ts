import { prisma } from "../lib/db";

async function main() {
    const stageId = "cmuqhw93o000p5wuqsz6iu9ih";
    const assignments = await prisma.rubricAssignment.findMany({ where: { stageId } });
    console.log("Assignments:", assignments);
    const reviews = await prisma.rubricReview.findMany({ where: { assignmentId: { in: assignments.map(a => a.id) } } });
    console.log("Reviews:", reviews);
}

main().catch(console.error).finally(() => prisma.$disconnect());
