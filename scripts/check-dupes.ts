import { prisma } from '../lib/db';

async function main() {
    const dupes = await prisma.project.findMany({
        where: { duplicateOfId: { not: null } },
        select: { id: true, duplicateOfId: true, title: true }
    });
    console.log('Duplicates:');
    dupes.forEach(d => console.log(`${d.id} ("${d.title}") is duplicate of ${d.duplicateOfId}`));
    
    // Check if member1_1@example.org is an organizer
    const user = await prisma.user.findUnique({ where: { email: 'member1_1@example.org' } });
    if (user) {
        const orgRole = await prisma.eventRole.findUnique({
            where: { eventId_userId_role: { eventId: 'evt_01', userId: user.id, role: 'ORGANIZER' } }
        });
        console.log('Is member1_1@example.org an organizer for evt_01?', !!orgRole);
    }
}
main().catch(console.error);
