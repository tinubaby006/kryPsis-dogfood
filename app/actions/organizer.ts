"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { QuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function addCustomQuestion(eventId: string, label: string, type: QuestionType, required: boolean) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
    });
    if (!isOrg) throw new Error("Forbidden");

    // Check if structural edits are frozen
    const projectCount = await prisma.project.count({ where: { eventId } });
    if (projectCount > 0) {
        throw new Error("Submissions exist. Structural edits are frozen.");
    }

    const maxSortOrder = await prisma.customQuestion.aggregate({
        where: { eventId },
        _max: { sortOrder: true }
    });

    const newOrder = (maxSortOrder._max.sortOrder || 0) + 1;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    await prisma.customQuestion.create({
        data: {
            eventId,
            key,
            label,
            type,
            required,
            sortOrder: newOrder,
            isPublic: false
        }
    });

    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function addTrack(eventId: string, name: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
    });
    if (!isOrg) throw new Error("Forbidden");

    const maxSortOrder = await prisma.track.aggregate({
        where: { eventId },
        _max: { sortOrder: true }
    });

    const newOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    await prisma.track.create({
        data: {
            eventId,
            name,
            sortOrder: newOrder
        }
    });

    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}
