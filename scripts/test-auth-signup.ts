import { auth } from '../lib/auth';
import { prisma } from '../lib/db';

async function main() {
    console.log("Attempting sign up...");
    // @ts-ignore
    const result = await auth.api.signUpEmail({
        body: {
            name: "Test User",
            email: "test_auth_123@example.com",
            password: "password123"
        }
    });

    console.log("Signup Result:", result);

    const user = await prisma.user.findFirst({
        where: { email: "test_auth_123@example.com" },
        include: { accounts: true }
    });

    console.log("Created Database Record:");
    console.dir(user, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
