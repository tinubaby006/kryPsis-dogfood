"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { QuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { parseLocalInTimezone } from "@/lib/utils";

async function checkOrganizerAccess(eventId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.isPlatformAdmin) return true;

    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId: { eventId, userId } }
    });
    return !!isOrg && isOrg.role === "ORGANIZER";
}

export async function addCustomQuestion(eventId: string, label: string, type: QuestionType, required: boolean) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    const projectCount = await prisma.project.count({ where: { eventId } });
    if (projectCount > 0) throw new Error("Submissions exist. Structural edits are frozen.");

    const maxSortOrder = await prisma.customQuestion.aggregate({
        where: { eventId }, _max: { sortOrder: true }
    });

    const newOrder = (maxSortOrder._max.sortOrder || 0) + 1;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    await prisma.customQuestion.create({
        data: { eventId, key, label, type, required, sortOrder: newOrder, isPublic: false }
    });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function deleteCustomQuestion(eventId: string, questionId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    const projectCount = await prisma.project.count({ where: { eventId } });
    if (projectCount > 0) throw new Error("Submissions exist. Structural edits are frozen.");

    await prisma.customQuestion.delete({ where: { id: questionId } });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function addTrack(eventId: string, name: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    const maxSortOrder = await prisma.track.aggregate({
        where: { eventId }, _max: { sortOrder: true }
    });

    await prisma.track.create({
        data: { eventId, name, sortOrder: (maxSortOrder._max.sortOrder || 0) + 1 }
    });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function deleteTrack(eventId: string, trackId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    await prisma.track.delete({ where: { id: trackId } });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function addPrize(eventId: string, name: string, description: string, amount?: number, currency?: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    const maxSortOrder = await prisma.prize.aggregate({
        where: { eventId }, _max: { sortOrder: true }
    });

    await prisma.prize.create({
        data: { eventId, name, description: description || "", amount: amount || null, currency: currency || null, sortOrder: (maxSortOrder._max.sortOrder || 0) + 1 }
    });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function deletePrize(eventId: string, prizeId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    await prisma.prize.delete({ where: { id: prizeId } });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}

export async function updateEventDetails(eventId: string, data: { name: string, visibility: "DRAFT" | "PUBLIC", maxTeamSize: number, submissionsCloseAt: string, timeZone: string, tracksMode: "SINGLE_POOL" | "MULTI_TRACK" }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    if (!(await checkOrganizerAccess(eventId, session.user.id))) throw new Error("Forbidden");

    const currentEvent = await prisma.event.findUnique({ where: { id: eventId } });
    if (!currentEvent) throw new Error("Event not found");

    if (currentEvent.tracksMode !== data.tracksMode) {
        const pCount = await prisma.project.count({ where: { eventId } });
        const sCount = await prisma.judgingStage.count({ where: { eventId } });
        const jCount = await prisma.eventJudgeAccess.count({ where: { eventId } });
        if (pCount > 0 || sCount > 0 || jCount > 0) {
            throw new Error("Cannot change tracks mode after projects, judges, or judging stages have been created.");
        }
    }

    await prisma.event.update({
        where: { id: eventId },
        data: {
            name: data.name,
            visibility: data.visibility,
            maxTeamSize: data.maxTeamSize,
            submissionsCloseAt: parseLocalInTimezone(data.submissionsCloseAt, data.timeZone),
            timeZone: data.timeZone,
            tracksMode: data.tracksMode
        }
    });
    revalidatePath(`/organizer/events/${eventId}`);
    return { success: true };
}
