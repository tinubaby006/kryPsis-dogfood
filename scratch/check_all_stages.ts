import { prisma } from "../lib/db";

async function main() {
    const stages = await prisma.judgingStage.findMany({ include: { outputPolicy: true } });
    for (const stage of stages) {
        console.log(`Stage ID: ${stage.id} | Name: ${stage.name} | State: ${stage.state} | Published: ${(stage.outputPolicy as any)?.isPublished}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
