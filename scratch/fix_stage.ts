import { prisma } from "../lib/db";

async function main() {
    // Revert the stage to CONFIGURED so they can edit it, or just fix requiredReviews
    await prisma.judgingStage.update({
        where: { id: "cmuqhw93o000p5wuqsz6iu9ih" }, // Hardcoded stageId from earlier script
        data: { 
            state: "CONFIGURED",
            requiredReviews: 1 // Fix it for them automatically
        }
    });
    console.log("Stage reverted to CONFIGURED and requiredReviews set to 1.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
