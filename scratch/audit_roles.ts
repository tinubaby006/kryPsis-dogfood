import { prisma } from '../lib/db';
async function main() {
    const roles = await prisma.eventRole.findMany();
    const map = new Map<string, string[]>();
    for (const r of roles) {
        const key = `${r.eventId}_${r.userId}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r.role);
    }
    let conflicts = 0;
    for (const [key, rolesList] of map.entries()) {
        if (rolesList.length > 1) {
            console.log(`Conflict: ${key} -> ${rolesList.join(', ')}`);
            conflicts++;
        }
    }
    if (conflicts === 0) console.log('No EventRole conflicts found!');
}
main().finally(() => prisma.$disconnect());
