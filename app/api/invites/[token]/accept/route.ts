import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "You must be logged in to accept an invite" } }, { status: 401 });
    }

    const { token } = await params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock the invite row
            const invites = await tx.$queryRaw<any[]>`
                SELECT id, "teamId", "eventId", "maxUses", "uses", "expiresAt", "revokedAt" 
                FROM "TeamInvite" 
                WHERE "tokenHash" = ${tokenHash} 
                FOR UPDATE
            `;

            if (invites.length === 0) {
                throw new Error("INVITE_NOT_FOUND");
            }

            const invite = invites[0];

            if (invite.revokedAt) {
                throw new Error("INVITE_REVOKED");
            }

            if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
                throw new Error("INVITE_EXPIRED");
            }

            if (invite.uses >= invite.maxUses) {
                throw new Error("INVITE_FULL");
            }

            // Lock the team row to check capacity
            const teams = await tx.$queryRaw<any[]>`
                SELECT id, "eventId"
                FROM "Team"
                WHERE id = ${invite.teamId}
                FOR UPDATE
            `;
            if (teams.length === 0) throw new Error("TEAM_NOT_FOUND");
            const team = teams[0];

            const event = await tx.event.findUnique({ where: { id: team.eventId } });
            if (!event) throw new Error("EVENT_NOT_FOUND");

            const currentMembersCount = await tx.teamMember.count({ where: { teamId: team.id } });
            if (currentMembersCount >= event.maxTeamSize) {
                throw new Error("TEAM_FULL");
            }

            // Check if user is already in a team for this event
            const existingMember = await tx.teamMember.findUnique({
                where: { eventId_userId: { eventId: team.eventId, userId: session.user.id } }
            });

            if (existingMember) {
                if (existingMember.teamId === team.id) {
                    // Idempotent success
                    return { success: true, teamId: team.id, eventId: team.eventId };
                }
                throw new Error("ALREADY_IN_TEAM");
            }

            // Increment invite uses
            await tx.$executeRaw`
                UPDATE "TeamInvite"
                SET uses = uses + 1
                WHERE id = ${invite.id}
            `;

            // Add user to team
            await tx.teamMember.create({
                data: {
                    eventId: team.eventId,
                    teamId: team.id,
                    userId: session.user.id,
                    role: "MEMBER"
                }
            });

            // Assign PARTICIPANT role if not already
            await tx.eventRole.upsert({
                where: { eventId_userId_role: { eventId: team.eventId, userId: session.user.id, role: "PARTICIPANT" } },
                update: {},
                create: { eventId: team.eventId, userId: session.user.id, role: "PARTICIPANT" }
            });

            return { success: true, teamId: team.id, eventId: team.eventId };
        });

        return NextResponse.json({ data: result });
    } catch (e: any) {
        let code = "INTERNAL_ERROR";
        let message = e.message;
        let status = 400;
        
        switch(e.message) {
            case "INVITE_NOT_FOUND":
                code = "NOT_FOUND"; message = "Invalid invitation link"; status = 404; break;
            case "INVITE_REVOKED":
                code = "REVOKED"; message = "This invitation has been revoked"; break;
            case "INVITE_EXPIRED":
                code = "EXPIRED"; message = "This invitation has expired"; break;
            case "INVITE_FULL":
                code = "FULL"; message = "This invitation link has reached its use limit"; break;
            case "TEAM_FULL":
                code = "TEAM_FULL"; message = "The team is already at maximum capacity"; break;
            case "ALREADY_IN_TEAM":
                code = "CONFLICT"; message = "You are already part of another team in this event"; status = 409; break;
        }

        return NextResponse.json({ error: { code, message } }, { status });
    }
}
