"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ProjectStatus, RecordSource, AssetKind } from "@prisma/client";

export type ProjectPayload = {
    projectId?: string;
    eventId: string;
    teamId: string;
    title: string;
    summary: string;
    description: string;
    repoUrl?: string;
    liveUrl?: string;
    demoVideoUrl?: string;
    techTags: string[];
    trackId?: string;
    status: "DRAFT" | "SUBMITTED";
    version: number;
    assets: {
        storageKey: string;
        kind: "THUMBNAIL" | "GALLERY";
        originalName: string;
        mimeType: string;
        bytes: number;
        sortOrder: number;
    }[];
    answers: { questionId: string; value: any }[];
};

export async function upsertProject(payload: ProjectPayload) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    return upsertProjectInternal(payload, session.user.id);
}

export async function upsertProjectInternal(payload: ProjectPayload, userId: string) {
    try {
        const { eventId, teamId, projectId, version, status, assets, answers, trackId } = payload;

    // 1. Verify cross-team access (is user a member of this team?)
    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } }
    });
    if (!member) throw new Error("Forbidden: Not a team member");

    // 2. Fetch event for deadline & track/question validation
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true, customQuestions: true }
    });
    if (!event) throw new Error("Event not found");

    // 3. EVENT_CLOSED Check
    // If it's a fixture event, we must reject closed POSTs with 409 EVENT_CLOSED
    if (new Date() > event.submissionsCloseAt) {
        // Exception: Demo event is always considered open conceptually, but we rely on its close date.
        throw new Error("409 EVENT_CLOSED");
    }

    // 4. Validate Track & Questions (cross-event bounds)
    if (event.tracksMode === "SINGLE_POOL") {
        if (trackId) throw new Error("SINGLE_POOL events cannot have track selections");
    } else {
        if (!trackId) throw new Error("MULTI_TRACK events require a valid track selection");
        if (!event.tracks.some(t => t.id === trackId)) {
            throw new Error("Invalid trackId for this event");
        }
    }

    const eventQuestionIds = new Set(event.customQuestions.map(q => q.id));
    for (const ans of answers) {
        if (!eventQuestionIds.has(ans.questionId)) {
            throw new Error(`Invalid questionId ${ans.questionId} for this event`);
        }
    }

    // 5. Completeness Validation (Only if SUBMITTING)
    if (status === "SUBMITTED") {
        if (!payload.title.trim()) throw new Error("Title is required to submit");
        // Check required questions
        for (const q of event.customQuestions) {
            if (q.required) {
                const ans = answers.find(a => a.questionId === q.id);
                if (!ans || !ans.value) {
                    throw new Error(`Required question ${q.label} is missing`);
                }
            }
        }
    }

    // 6. Centralized Transaction
    const result = await prisma.$transaction(async (tx) => {
            let pid = projectId;
            
            if (pid) {
                // UPDATE
                // Optimistic Concurrency Control
                const updateRes = await tx.project.updateMany({
                    where: { id: pid, eventId, version },
                    data: {
                        title: payload.title,
                        summary: payload.summary,
                        description: payload.description,
                        repoUrl: payload.repoUrl || null,
                        liveUrl: payload.liveUrl || null,
                        demoVideoUrl: payload.demoVideoUrl || null,
                        techTags: payload.techTags,
                        trackId: payload.trackId || null,
                        status: payload.status,
                        submittedAt: payload.status === "SUBMITTED" ? new Date() : null,
                        version: { increment: 1 }
                    }
                });

                if (updateRes.count === 0) {
                    // It means either it doesn't exist, or version mismatch
                    const exists = await tx.project.findUnique({ where: { id: pid } });
                    if (exists) {
                        throw new Error("409 CONFLICT: Stale edit detected.");
                    }
                    throw new Error("Project not found");
                }
            } else {
                // CREATE
                // One project per team
                const existing = await tx.project.findFirst({ where: { teamId } });
                if (existing) {
                    throw new Error("Team already has a project");
                }

                const created = await tx.project.create({
                    data: {
                        eventId,
                        teamId,
                        title: payload.title,
                        summary: payload.summary,
                        description: payload.description,
                        repoUrl: payload.repoUrl || null,
                        liveUrl: payload.liveUrl || null,
                        demoVideoUrl: payload.demoVideoUrl || null,
                        techTags: payload.techTags,
                        trackId: payload.trackId || null,
                        status: payload.status,
                        submittedAt: payload.status === "SUBMITTED" ? new Date() : null,
                        version: 1,
                        source: "LIVE"
                    }
                });
                pid = created.id;
            }

            // Sync Assets
            // Delete old assets not in new list, or just clear and recreate? 
            // Assets have a unique storageKey. We can upsert.
            await tx.projectAsset.deleteMany({
                where: { projectId: pid }
            });

            if (assets.length > 0) {
                await tx.projectAsset.createMany({
                    data: assets.map(a => ({
                        eventId,
                        projectId: pid!,
                        kind: a.kind,
                        storageKey: a.storageKey,
                        originalName: a.originalName,
                        mimeType: a.mimeType,
                        bytes: a.bytes,
                        sortOrder: a.sortOrder,
                        createdById: userId
                    }))
                });
            }

            // Sync Answers
            await tx.customAnswer.deleteMany({
                where: { projectId: pid }
            });

            if (answers.length > 0) {
                await tx.customAnswer.createMany({
                    data: answers.map(a => ({
                        projectId: pid!,
                        eventId,
                        questionId: a.questionId,
                        value: a.value
                    }))
                });
            }

            return await tx.project.findUnique({ where: { id: pid } });
        });

        revalidatePath(`/events/${eventId}/projects`);
        revalidatePath(`/events/${eventId}/team`);

        return { success: true, project: result };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
