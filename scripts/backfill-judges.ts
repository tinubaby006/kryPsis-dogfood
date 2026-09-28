import { prisma } from "../lib/db";

async function main() {
    console.log("Starting judge backfill...");

    // Find all active JUDGE roles
    const judgeRoles = await prisma.eventRole.findMany({
        where: { role: "JUDGE" },
        include: { user: true }
    });

    console.log(`Found ${judgeRoles.length} judge roles.`);

    for (const role of judgeRoles) {
        const { eventId, userId, user } = role;
        
        if (!user) continue;

        // Check if access already exists to prevent duplicate failures
        const existing = await prisma.eventJudgeAccess.findFirst({
            where: { eventId, userId }
        });
        
        if (existing) {
            console.log(`Access for ${user.email} in event ${eventId} already exists, skipping.`);
            continue;
        }

        // Get tracks for this judge in this event
        const judgeTracks = await prisma.judgeTrack.findMany({
            where: { eventId, userId }
        });

        // We need an "invitedBy" admin. Let's find the event creator.
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { createdById: true }
        });
        
        const adminId = event?.createdById || userId; // Fallback

        const access = await prisma.eventJudgeAccess.create({
            data: {
                eventId,
                emailNormalized: user.email.trim().toLowerCase(),
                userId,
                status: "ACTIVE",
                invitedById: adminId,
                confirmedById: adminId,
                acceptedAt: new Date(),
                confirmedAt: new Date(),
                tracks: {
                    create: judgeTracks.map(t => ({
                        trackId: t.trackId
                    }))
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                action: "JUDGE_ACCESS_BACKFILL",
                actorUserId: adminId,
                entityType: "EVENT",
                entityId: eventId,
                metadata: {
                    accessId: access.id,
                    userId,
                    tracks: judgeTracks.map(t => t.trackId),
                    provenance: "Stage 5D Migration"
                }
            }
        });

        console.log(`Backfilled judge ${user.email} in event ${eventId} with ${judgeTracks.length} tracks.`);
    }

    console.log("Backfill complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
