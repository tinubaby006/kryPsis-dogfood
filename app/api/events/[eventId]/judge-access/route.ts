import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { randomBytes } from "crypto";
import { hashToken } from "@/lib/auth-utils";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { eventId } = await params;

    // Check organizer
    const organizer = await prisma.eventRole.findFirst({
        where: { eventId, userId: session.user.id, role: "ORGANIZER" }
    });
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    
    if (!organizer && !user?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const accesses = await prisma.eventJudgeAccess.findMany({
            where: { eventId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                tracks: { include: { track: { select: { id: true, name: true } } } }
            },
            orderBy: { createdAt: "desc" }
        });

        // Map correctly
        const results = accesses.map(a => ({
            id: a.id,
            emailNormalized: a.emailNormalized,
            userId: a.userId,
            user: a.user,
            status: a.status,
            expiresAt: a.expiresAt,
            tracks: a.tracks.map(t => ({ id: t.trackId, name: t.track.name })),
            version: a.version
        }));

        return NextResponse.json({ accesses: results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ eventId: string }> }
) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { eventId } = await params;

    const organizer = await prisma.eventRole.findFirst({
        where: { eventId, userId: session.user.id, role: "ORGANIZER" }
    });
    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    
    if (!organizer && !adminUser?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { email, trackIds } = body;

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Invalid email" }, { status: 422 });
        }
        if (!Array.isArray(trackIds) || trackIds.length === 0) {
            return NextResponse.json({ error: "At least one track required" }, { status: 422 });
        }

        const emailNormalized = email.trim().toLowerCase();

        const result = await prisma.$transaction(async (tx) => {
            const existingAccess = await tx.eventJudgeAccess.findUnique({
                where: { eventId_emailNormalized: { eventId, emailNormalized } }
            });

            if (existingAccess) {
                throw new Error("409 CONFLICT: User is already invited or has access");
            }

            // Check if user exists
            const user = await tx.user.findUnique({
                where: { email: emailNormalized }
            });

            let status: "INVITED" | "AWAITING_CONFIRMATION" | "ACTIVE" = "INVITED";
            let rawToken: string | undefined;
            let tokenHash: string | undefined;
            let expiresAt: Date | undefined;
            
            // Check conflicts if user exists
            if (user) {
                const conflict = await tx.eventRole.findFirst({
                    where: { eventId, userId: user.id, role: { in: ["ORGANIZER", "PARTICIPANT"] } }
                });
                if (conflict) {
                    throw new Error(`409 CONFLICT: User has conflicting role: ${conflict.role}`);
                }
                status = "AWAITING_CONFIRMATION";
            } else {
                // New offline token
                rawToken = randomBytes(32).toString("hex");
                tokenHash = hashToken(rawToken);
                expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            }

            const access = await tx.eventJudgeAccess.create({
                data: {
                    eventId,
                    emailNormalized,
                    userId: user?.id,
                    status,
                    tokenHash,
                    expiresAt,
                    invitedById: session.user.id,
                    tracks: {
                        create: trackIds.map((id: string) => ({ trackId: id }))
                    }
                }
            });

            await tx.auditLog.create({
                data: {
                    action: "JUDGE_ACCESS_CREATED",
                    actorUserId: session.user.id,
                    entityType: "EVENT",
                    entityId: eventId,
                    metadata: { accessId: access.id, emailNormalized, trackIds }
                }
            });

            return { access, rawToken };
        });

        return NextResponse.json({ success: true, ...result });

    } catch (e: any) {
        if (e.message?.includes("409 CONFLICT")) {
            return NextResponse.json({ error: e.message.replace("409 CONFLICT: ", "") }, { status: 409 });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
