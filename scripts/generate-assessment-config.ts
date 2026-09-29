import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
        data: {
            id: crypto.randomUUID(),
            userId,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            ipAddress: "127.0.0.1",
            userAgent: "CLI Runner"
        }
    });
    return token;
}

async function main() {
    console.log("Generating official assessment configuration...");
    
    // We need users from fixtures
    // In our seed, these are the emails:
    const organizer = await prisma.user.findUnique({ where: { email: 'organizer@test.com' } });
    
    // The fixtures.json judges have emails like 'jdg_a@example.com'.
    // Let's grab two random judges.
    const judges = await prisma.user.findMany({
        where: { email: { contains: 'judge' } },
        take: 2
    });
    
    // A participant (just grab any member of a team)
    const participantUser = await prisma.user.findFirst({
        where: { email: 'hacker@test.com' }
    });

    if (!organizer || judges.length < 2 || !participantUser) {
        console.warn("Could not find all test users. Seed might be missing. Proceeding with best effort.");
    }

    const orgSession = organizer ? await createSession(organizer.id) : "dummy_org";
    const jdgASession = judges[0] ? await createSession(judges[0].id) : "dummy_jdg_a";
    const jdgBSession = judges[1] ? await createSession(judges[1].id) : "dummy_jdg_b";
    const pSession = participantUser ? await createSession(participantUser.id) : "dummy_prt";

    // Write .dogfood.toml
    const tomlContent = `
[portal]
base_url = "http://127.0.0.1:3000"

[auth]
organizer   = "Cookie: better-auth.session_token=${orgSession}"
judge_a     = "Cookie: better-auth.session_token=${jdgASession}"
judge_b     = "Cookie: better-auth.session_token=${jdgBSession}"
participant = "Cookie: better-auth.session_token=${pSession}"

[routes]
gallery      = "/events/evt_01/projects"
submit       = "/events/evt_01/team/project"
judge_scores = "/dashboard/judging"
peer_scores  = "/dashboard/judging?judge=judge_a"
csv_export   = "/api/export.csv"
`;

    fs.writeFileSync(path.join(process.cwd(), '.dogfood.toml'), tomlContent.trim());
    console.log(".dogfood.toml written successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
