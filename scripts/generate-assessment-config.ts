import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

// Local setup only: authenticate real users against the RUNNING application.
// Never delete accounts, rewrite passwords, invent sessions or elevate to admin.
const base = new URL(process.env.DOGFOOD_BASE_URL || 'http://127.0.0.1:3000');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
    !['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Assessment setup requires a local HTTP(S) base URL.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Use the running app database.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const password = process.env.DOGFOOD_DEMO_PASSWORD || 'dogfood_local_dev';
const eventId = 'evt_01';
const origin = base.origin;

async function login(email: string, allowCreate = false) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing && !allowCreate) throw new Error(`Seeded account missing: ${email}. Import fixtures first.`);
    const endpoint = existing ? 'sign-in/email' : 'sign-up/email';
    const res = await fetch(`${origin}/api/auth/${endpoint}`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ email, password, name: 'Local assessment organizer' })
    });
    if (!res.ok) throw new Error(`Login failed for ${email}: HTTP ${res.status}. Check the local password, app URL and database. No accounts were deleted.`);
    const body = await res.json();
    const cookie = res.headers.getSetCookie()
        .map(value => value.split(';', 1)[0])
        .filter(value => value.includes('=') && !value.endsWith('='))
        .join('; ');
    if (!body.user?.id || !cookie) throw new Error(`Login returned no user/session cookie for ${email}.`);
    const local = await prisma.user.findUnique({ where: { email } });
    if (!local || local.id !== body.user.id) throw new Error('App and setup script appear to use different databases.');
    if (local.isPlatformAdmin) throw new Error(`Assessment role must not be a platform admin: ${email}`);
    const verify = await fetch(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie }, redirect: 'manual' });
    if (verify.status !== 200 || (await verify.json())?.user?.id !== local.id) {
        throw new Error(`The running app rejected the freshly issued session for ${email}.`);
    }
    return { userId: local.id, cookie };
}

async function expectStatus(route: string, cookie: string, expected: number) {
    const res = await fetch(origin + route, { headers: { Cookie: cookie }, redirect: 'manual' });
    if (res.status !== expected) throw new Error(`Preflight ${route}: got ${res.status}, expected ${expected}. Existing config was not replaced.`);
    return res;
}

async function main() {
    const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/official/fixtures.json'), 'utf8'));
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Fixture event evt_01 is missing. Import fixtures first.');
    if (fixtures.judges.length < 2 || !fixtures.teams[0]?.members[0]) throw new Error('Fixture identities missing.');
    const claimed = (process.env.DOGFOOD_CLAIMED_TIERS || 'T1').split(',').map(x => x.trim());
    if (claimed.some(x => !['T1', 'T2'].includes(x))) throw new Error('This setup supports claims T1 or T1,T2.');

    const judgeA = await login(fixtures.judges[0].email);
    const judgeB = await login(fixtures.judges[1].email);
    const participant = await login(fixtures.teams[0].members[0]);
    for (const [account, role] of [[judgeA, 'JUDGE'], [judgeB, 'JUDGE'], [participant, 'PARTICIPANT']] as const) {
        const roles = await prisma.eventRole.findMany({ where: { eventId, userId: account.userId } });
        if (roles.length !== 1 || roles[0].role !== role) throw new Error(`Seeded ${role} account has missing/conflicting event roles.`);
    }
    const organizer = await login('assessment_organizer@dogfood.local', true);
    const orgRoles = await prisma.eventRole.findMany({ where: { eventId, userId: organizer.userId } });
    if (orgRoles.some(r => r.role !== 'ORGANIZER')) throw new Error('Assessment organizer has a conflicting event role.');
    await prisma.eventRole.upsert({
        where: { eventId_userId: { eventId, userId: organizer.userId } },
        create: { eventId, userId: organizer.userId, role: 'ORGANIZER' }, update: { role: 'ORGANIZER' }
    });
    const own = `/api/judge/scores?eventId=${eventId}`;
    const peer = `${own}&judgeUserId=${encodeURIComponent(judgeA.userId)}`;
    // Export authentic historical fixture evidence, without creating a pretend stage.
    const csv = `/organizer/events/${eventId}/exports?type=historical_reviews`;
    const ownResponse = await expectStatus(own, judgeA.cookie, 200);
    const ownBody = await ownResponse.json();
    if (!ownBody.historicalReviews?.length) throw new Error('Judge A historical fixture scores are absent.');
    await expectStatus(peer, judgeA.cookie, 200);
    await expectStatus(peer, judgeB.cookie, 403);
    await expectStatus(own, participant.cookie, 403);
    const exported = await expectStatus(csv, organizer.cookie, 200);
    if (!(exported.headers.get('content-type') || '').includes('text/csv') ||
        !(await exported.text()).split('\n')[0].includes(',')) throw new Error('Export is not genuine CSV.');
    await expectStatus(csv, judgeA.cookie, 403);

    const quote = (value: string) => JSON.stringify(value);
    const contents = `[portal]\nbase_url = ${quote(origin)}\n\n[tiers]\nclaimed = ${JSON.stringify(claimed)}\npitch = "Local event-scoped judging and evidence exports."\n\n[auth]\norganizer = ${quote('Cookie: ' + organizer.cookie)}\njudge_a = ${quote('Cookie: ' + judgeA.cookie)}\njudge_b = ${quote('Cookie: ' + judgeB.cookie)}\nparticipant = ${quote('Cookie: ' + participant.cookie)}\n\n[routes]\ngallery = "/events/evt_01/projects"\nsubmit = "/api/submit"\njudge_scores = ${quote(own)}\npeer_scores = ${quote(peer)}\ncsv_export = ${quote(csv)}\n`;
    const target = path.join(process.cwd(), '.dogfood.toml');
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, contents, { mode: 0o600 });
    fs.renameSync(temporary, target);
    console.log('Fresh local sessions verified. .dogfood.toml written; no tokens printed.');
    console.log('Run: python docs/official/run.py .dogfood.toml');
    console.log('Sessions expire; regenerate after database/secret changes. T1 is the default claim.');
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Assessment setup failed');
    process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); await pool.end(); });
