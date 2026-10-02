import { prisma } from "../lib/db";

async function main() {
    const event = await prisma.event.findUnique({ 
        where: { slug: "testeventforjudge" },
        include: {
            judgingStages: { include: { judges: true, assignments: true, projects: true, rubrics: true } }
        }
    });
    console.log(JSON.stringify(event, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
