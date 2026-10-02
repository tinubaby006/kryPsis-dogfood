import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("FATAL: BETTER_AUTH_SECRET environment variable is required.");
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    rateLimit: {
        window: 10,
        max: 1000
    }
});
