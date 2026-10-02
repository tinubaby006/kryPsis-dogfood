import { prisma } from '../lib/db';

async function main() {
  const roles = await prisma.eventRole.findMany();
  const counts = new Map<string, number>();
  for (const role of roles) {
    const key = `${role.eventId}:${role.userId}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = [];
  for (const [key, count] of counts.entries()) {
    if (count > 1) {
      duplicates.push({ key, count });
    }
  }
  console.log("Total EventRoles:", roles.length);
  console.log("Duplicates found:", duplicates);
}
main().finally(() => prisma.$disconnect());
