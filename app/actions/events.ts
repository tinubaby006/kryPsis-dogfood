"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createEventSchema, updateTrackSchema, updatePrizeSchema, updateCustomQuestionSchema } from "@/lib/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createEvent(formData: z.infer<typeof createEventSchema>) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.canCreateEvents) return { error: "Forbidden: You do not have permission to create events" };

    const parsed = createEventSchema.safeParse(formData);
    if (!parsed.success) return { error: "Invalid data", details: parsed.error.format() };

    const data = parsed.data;

    try {
        const event = await prisma.$transaction(async (tx) => {
            const ev = await tx.event.create({
                data: {
                    slug: data.slug,
                    name: data.name,
                    description: data.description || "",
                    startsAt: data.startsAt ? new Date(data.startsAt) : null,
                    endsAt: data.endsAt ? new Date(data.endsAt) : null,
                    submissionsOpenAt: data.submissionsOpenAt ? new Date(data.submissionsOpenAt) : null,
                    submissionsCloseAt: new Date(data.submissionsCloseAt),
                    visibility: data.visibility as any,
                    maxTeamSize: data.maxTeamSize,
                    createdById: user.id
                }
            });

            await tx.eventRole.create({
                data: {
                    eventId: ev.id,
                    userId: user.id,
                    role: "ORGANIZER"
                }
            });

            return ev;
        });

        revalidatePath("/organizer");
        return { success: true, eventId: event.id };
    } catch (e: any) {
        if (e.code === "P2002") {
            return { error: "Event slug already exists" };
        }
        return { error: e.message || "Failed to create event" };
    }
}

// Function to handle track, prize, and question configuration updates
export async function updateEventConfig(eventId: string, config: {
    tracks: z.infer<typeof updateTrackSchema>[],
    prizes: z.infer<typeof updatePrizeSchema>[],
    questions: z.infer<typeof updateCustomQuestionSchema>[]
}) {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
    });
    if (!isOrg) return { error: "Forbidden: You are not an organizer of this event" };

    // Validate inputs
    const tracksParsed = z.array(updateTrackSchema).safeParse(config.tracks);
    const prizesParsed = z.array(updatePrizeSchema).safeParse(config.prizes);
    const qsParsed = z.array(updateCustomQuestionSchema).safeParse(config.questions);

    if (!tracksParsed.success || !prizesParsed.success || !qsParsed.success) {
        return { error: "Invalid configuration data" };
    }

    try {
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
        return { error: e.message || "Failed to update configuration" };
    }
}
