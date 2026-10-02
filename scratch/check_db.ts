import { prisma } from "../../lib/db";

async function main() {
    const event = await prisma.event.findUnique({ where: { slug: "dogfood-2026" }});
    console.log("Event:", event?.id);

    const stages = await prisma.judgingStage.findMany({
        where: { eventId: event?.id },
        include: { judges: true, assignments: true }
    });

    console.log("Stages:", JSON.stringify(stages, null, 2));

    const projects = await prisma.project.findMany({
        where: { eventId: event?.id }
    });

    console.log("Total Projects:", projects.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
