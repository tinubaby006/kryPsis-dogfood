"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTeam(eventId: string, name: string) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    if (!name || name.trim() === "") {
        return { error: "Team name is required" };
    }

    try {
        const team = await prisma.$transaction(async (tx) => {
            // Check if user is already in a team for this event
            const existingMember = await tx.teamMember.findUnique({
                where: { eventId_userId: { eventId, userId: session.user.id } }
            });
            if (existingMember) {
                throw new Error("You are already part of a team for this event");
            }

            // Create Team
            const newTeam = await tx.team.create({
                data: {
                    eventId,
                    name: name.trim(),
                    createdById: session.user.id,
                }
            });

            // Create TeamMember as OWNER
            await tx.teamMember.create({
                data: {
                    eventId,
                    teamId: newTeam.id,
                    userId: session.user.id,
                    role: "OWNER"
                }
            });

            // Assign PARTICIPANT role
            await tx.eventRole.upsert({
                where: { eventId_userId: { eventId, userId: session.user.id } },
                update: { role: "PARTICIPANT" },
                create: { eventId, userId: session.user.id, role: "PARTICIPANT" }
            });

            return newTeam;
        });

        revalidatePath(`/events/${eventId}`);
        return { success: true, teamId: team.id };
    } catch (e: any) {
        return { error: e.message || "Failed to create team" };
    }
}
