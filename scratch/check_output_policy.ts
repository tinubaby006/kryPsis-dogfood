import { prisma } from "../lib/db";

async function main() {
    const stageId = "cmuqhw93o000p5wuqsz6iu9ih";
    const stage = await prisma.judgingStage.findUnique({ where: { id: stageId } });
    console.log("Stage state:", stage?.state);
    console.log("Output Policy:", stage?.outputPolicy);
}

main().catch(console.error).finally(() => prisma.$disconnect());
