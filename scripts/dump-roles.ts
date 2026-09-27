import { prisma } from '../lib/db';

async function main() {
    const user = await prisma.user.findUnique({where: {email: 'member1_1@example.org'}}); 
    if (!user) {
        console.log("user not found");
        return;
    }
    const roles = await prisma.eventRole.findMany({where: {userId: user.id}}); 
    console.log("Roles for member1_1:", roles);
    console.log("Is Admin:", user.isPlatformAdmin);
}
main().finally(() => prisma.$disconnect());
