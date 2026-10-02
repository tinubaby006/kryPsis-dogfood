"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createEventSchema, updateTrackSchema, updatePrizeSchema, updateCustomQuestionSchema } from "@/lib/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";


import { requireEventOrganizer, PermissionError } from "@/lib/permissions";

// Function to handle track, prize, and question configuration updates
export async function updateEventConfig(eventId: string, config: {
    tracks: z.infer<typeof updateTrackSchema>[],
    prizes: z.infer<typeof updatePrizeSchema>[],
    questions: z.infer<typeof updateCustomQuestionSchema>[]
}) {
    try {
        await requireEventOrganizer(eventId);

        // Validate inputs
        const tracksParsed = z.array(updateTrackSchema).safeParse(config.tracks);
        const prizesParsed = z.array(updatePrizeSchema).safeParse(config.prizes);
        const qsParsed = z.array(updateCustomQuestionSchema).safeParse(config.questions);

        if (!tracksParsed.success || !prizesParsed.success || !qsParsed.success) {
            return { error: "Invalid configuration data" };
        }

        await prisma.$transaction(async (tx) => {
            // Check if submissions exist (to freeze structural question edits)
            const submissionsCount = await tx.project.count({ where: { eventId, status: "SUBMITTED" } });
            const submissionsExist = submissionsCount > 0;

            // Handle Tracks: Reject deleting referenced tracks
            const existingTracks = await tx.track.findMany({ where: { eventId } });
            const newTrackIds = tracksParsed.data.map(t => t.id).filter(Boolean);
            const deletedTracks = existingTracks.filter(et => !newTrackIds.includes(et.id));

            for (const dt of deletedTracks) {
                const isReferenced = await tx.project.count({ where: { trackId: dt.id } });
                if (isReferenced > 0) {
                    throw new Error(`Cannot delete track '${dt.name}' because it is referenced by existing projects.`);
                }
                await tx.track.delete({ where: { id: dt.id } });
            }

            for (const t of tracksParsed.data) {
                if (t.id) {
                    if (!existingTracks.find(et => et.id === t.id)) {
                        throw new Error(`Track ${t.id} does not belong to this event`);
                    }
                    await tx.track.update({
                        where: { id: t.id },
                        data: { name: t.name, description: t.description || "", sortOrder: t.sortOrder }
                    });
                } else {
                    await tx.track.create({
                        data: { eventId, name: t.name, description: t.description || "", sortOrder: t.sortOrder }
                    });
                }
            }

            // Handle Prizes
            const existingPrizes = await tx.prize.findMany({ where: { eventId } });
            const newPrizeIds = prizesParsed.data.map(p => p.id).filter(Boolean);
            const deletedPrizes = existingPrizes.filter(ep => !newPrizeIds.includes(ep.id));
            
            await tx.prize.deleteMany({ where: { id: { in: deletedPrizes.map(p => p.id) } } });

            for (const p of prizesParsed.data) {
                if (p.id) {
                    if (!existingPrizes.find(ep => ep.id === p.id)) {
                        throw new Error(`Prize ${p.id} does not belong to this event`);
                    }
                    await tx.prize.update({
                        where: { id: p.id },
                        data: { name: p.name, description: p.description || "", amount: p.amount, currency: p.currency, sortOrder: p.sortOrder }
                    });
                } else {
                    await tx.prize.create({
                        data: { eventId, name: p.name, description: p.description || "", amount: p.amount, currency: p.currency, sortOrder: p.sortOrder }
                    });
                }
            }

            // Handle Custom Questions
            const existingQs = await tx.customQuestion.findMany({ where: { eventId } });
            const newQKeys = qsParsed.data.map(q => q.key);
            const deletedQs = existingQs.filter(eq => !newQKeys.includes(eq.key));

            if (submissionsExist && deletedQs.length > 0) {
                throw new Error("Cannot delete custom questions after submissions exist.");
            }

            for (const dq of deletedQs) {
                await tx.customQuestion.delete({ where: { id: dq.id } });
            }

            for (const q of qsParsed.data) {
                const existing = existingQs.find(eq => eq.key === q.key);
                if (existing) {
                    if (submissionsExist) {
                        if (existing.type !== q.type || existing.required !== q.required) {
                            throw new Error(`Cannot change type or required status of question '${q.key}' after submissions exist.`);
                        }
                    }
                    await tx.customQuestion.update({
                        where: { id: existing.id },
                        data: { label: q.label, options: q.options || null, isPublic: q.isPublic, sortOrder: q.sortOrder }
                    });
                } else {
                    if (submissionsExist) {
                        throw new Error(`Cannot add new custom questions after submissions exist.`);
                    }
                    await tx.customQuestion.create({
                        data: { eventId, key: q.key, label: q.label, type: q.type, required: q.required, options: q.options || null, isPublic: q.isPublic, sortOrder: q.sortOrder }
                    });
                }
            }
        });

        revalidatePath(`/organizer/events/${eventId}`);
        return { success: true };
    } catch (e: any) {
        if (e instanceof PermissionError) return { error: e.message };
        return { error: e.message || "Failed to update configuration" };
    }
}
