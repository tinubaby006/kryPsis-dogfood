import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'tomas.varga@example.org';
    const password = 'dogfood_local_dev';
    const origin = 'http://127.0.0.1:3000';
    
    const existing = await prisma.user.findUnique({ where: { email } });
    const endpoint = existing ? 'sign-in/email' : 'sign-up/email';
    const res = await fetch(`${origin}/api/auth/${endpoint}`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ email, password, name: 'Local assessment organizer' })
    });
    
    const cookie = res.headers.getSetCookie()
        .map(value => value.split(';', 1)[0])
        .filter(value => value.includes('=') && !value.endsWith('='))
        .join('; ');
        
    const scoresRes = await fetch(`${origin}/api/judge/scores?eventId=evt_01`, {
        headers: { Cookie: cookie }, redirect: 'manual'
    });
    
    console.log('Status:', scoresRes.status);
    const body = await scoresRes.json();
    console.log('Body keys:', Object.keys(body));
    console.log('Historical reviews count:', body.historicalReviews?.length);
    console.log('Body:', JSON.stringify(body, null, 2));
}
main().finally(() => prisma.$disconnect());
