import { auth } from '../lib/auth';
import { prisma } from '../lib/db';

async function main() {
    console.log("Generating hash for dogfood_local_dev...");
    // @ts-ignore
    const result = await auth.api.signUpEmail({
        body: {
            name: "Temp Pass Gen",
            email: "temp_pass_gen@example.com",
            password: "dogfood_local_dev"
        }
    });

    const user = await prisma.user.findFirst({
        where: { email: "temp_pass_gen@example.com" },
        include: { accounts: true }
    });

    const hash = user?.accounts[0].password;
    console.log("CORRECT HASH IS:", hash);

    if (hash) {
        console.log("Updating all fixture accounts with this hash...");
        await prisma.account.updateMany({
            where: { providerId: "credential" },
            data: { password: hash }
        });
        console.log("Updated successfully!");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
