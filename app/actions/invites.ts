"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function generateInvite(teamId: string, eventId: string, maxUses: number = 10, expireHours: number = 24) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } }
    });

    if (member?.role !== "OWNER") {
        return { error: "Only the team owner can generate invites" };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.teamInvite.create({
        data: {
            eventId,
            teamId,
            tokenHash,
            createdById: session.user.id,
            maxUses,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * expireHours)
        }
    });

    revalidatePath(`/events/${eventId}/team`);
    return { success: true, token: rawToken };
}

export async function revokeInvite(inviteId: string, teamId: string, eventId: string) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } }
    });

    if (member?.role !== "OWNER") {
        return { error: "Only the team owner can revoke invites" };
    }

    await prisma.teamInvite.update({
        where: { id: inviteId },
        data: { revokedAt: new Date() }
    });

    revalidatePath(`/events/${eventId}/team`);
    return { success: true };
}
