import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { auth } from '../lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getSessionToken(email: string, role?: 'ORGANIZER'|'JUDGE', eventId?: string): Promise<{ token: string, userId: string }> {
    try {
        await prisma.user.delete({ where: { email } }).catch(() => {});
        const res = await fetch("http://127.0.0.1:3000/api/auth/sign-up/email", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Origin": "http://127.0.0.1:3000" },
            body: JSON.stringify({ email, password: "dogfoodpassword", name: email })
        });
        
        const json = await res.json();
        
        if (role === 'ORGANIZER') {
            await prisma.user.update({ where: { email }, data: { isPlatformAdmin: true } });
        } else if (role === 'JUDGE') {
            await prisma.eventRole.upsert({
                where: { eventId_userId_role: { eventId: "evt_01", userId: json.user.id, role: "JUDGE" } },
                create: { eventId: "evt_01", userId: json.user.id, role: "JUDGE" },
                update: {}
            });
        }
        
        const cookies = res.headers.getSetCookie();
        for (const cookie of cookies) {
            if (cookie.includes("better-auth.session_token")) {
                const match = cookie.match(/better-auth\.session_token=([^;]+)/);
                if (match) {
                    return { token: match[1], userId: json.user.id };
                }
            }
        }
    } catch(e) { console.error(e); }
    return { token: "dummy", userId: "dummy" };
}

async function main() {
    console.log("Generating official assessment configuration...");
    
    const org = await getSessionToken('new_org@test.com', 'ORGANIZER');
    const jdgA = await getSessionToken('new_jdg_a@test.com', 'JUDGE');
    const jdgB = await getSessionToken('new_jdg_b@test.com', 'JUDGE');
    const prt = await getSessionToken('new_prt@test.com');

    // Create the required stage
    await prisma.judgingStage.upsert({
        where: { id: "evt01_stage_1" },
        create: {
            id: "evt01_stage_1",
            eventId: "evt_01",
            name: "Initial Review",
            state: "CONFIGURED",
            scopeKey: "GLOBAL"
        },
        update: {}
    });

    const tomlContent = `
[portal]
base_url = "http://127.0.0.1:3000"

[auth]
organizer   = "Cookie: better-auth.session_token=${org.token}"
judge_a     = "Cookie: better-auth.session_token=${jdgA.token}"
judge_b     = "Cookie: better-auth.session_token=${jdgB.token}"
participant = "Cookie: better-auth.session_token=${prt.token}"

[routes]
gallery      = "/events/evt_01/projects"
submit       = "/api/submit"
judge_scores = "/api/judge/scores"
peer_scores  = "/api/judge/scores?judgeUserId=${jdgA.userId}"
csv_export   = "/organizer/events/evt_01/exports?type=results&stageId=evt01_stage_1"
`;

    fs.writeFileSync(path.join(process.cwd(), '.dogfood.toml'), tomlContent.trim());
    console.log(".dogfood.toml written successfully.");
}

main().finally(async () => await prisma.$disconnect());
