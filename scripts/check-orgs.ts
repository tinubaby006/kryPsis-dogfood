import { prisma } from '../lib/db';

async function main() {
    const orgs = await prisma.eventRole.findMany({
        where: { eventId: 'evt_01', role: 'ORGANIZER' },
        include: { user: true }
    });
    console.log('Organizers for evt_01:');
    orgs.forEach(o => console.log(`- ${o.user.email} (ID: ${o.user.id})`));
}
main().catch(console.error);
