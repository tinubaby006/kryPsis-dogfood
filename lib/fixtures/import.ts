import { PrismaClient, Prisma, TracksMode, AssignmentStatus, RecordSource, EventJudgeAccessStatus } from '@prisma/client';
import crypto from 'crypto';

const PROJECTION_VERSION = 1;

export async function importFixtureToModernStage(
    prisma: PrismaClient,
    rawFixtures: string,
    adminUserId: string,
    organizerUserId: string
) {
    const fixturesHash = crypto.createHash('sha256').update(rawFixtures).digest('hex');
    const data = JSON.parse(rawFixtures);
    const eventId = data.event.id;

    await prisma.$transaction(async (tx) => {
        // Serialize concurrent import
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;

        let fixtureImport = await tx.fixtureImport.findUnique({
            where: { sourceName_sourceSha256: { sourceName: 'fixtures.json', sourceSha256: fixturesHash } }
        });

        // 1. Ensure Users
        const usersMap = new Map<string, string>();
        const emails = new Set<string>();
        data.judges.forEach((j: any) => emails.add(j.email));
        data.teams.forEach((t: any) => t.members.forEach((m: string) => emails.add(m)));
        
        for (const email of emails) {
            let user = await tx.user.findUnique({ where: { email } });
            if (!user) {
                user = await tx.user.create({
                    data: {
                        name: email.split('@')[0],
                        email,
                        emailVerified: true
                    }
                });
            }
            usersMap.set(email, user.id);
        }

        // 2. Ensure Event
        await tx.event.upsert({
            where: { id: eventId },
            update: {}, // Don't overwrite edits
            create: {
                id: eventId,
                slug: eventId,
                name: data.event.name,
                submissionsCloseAt: new Date(data.event.submissions_close),
                visibility: "PUBLIC",
                tracksMode: TracksMode.MULTI_TRACK,
                createdById: adminUserId,
                fixtureSource: 'fixtures.json'
            }
        });

        // Organizer
        await tx.eventRole.upsert({
            where: { eventId_userId: { eventId, userId: organizerUserId } },
            update: {},
            create: { eventId, userId: organizerUserId, role: "ORGANIZER" }
        });

        // 3. Tracks
        const trackIds = new Set<string>();
        for (let i = 0; i < data.tracks.length; i++) {
            const track = data.tracks[i];
            await tx.track.upsert({
                where: { id_eventId: { id: track.id, eventId } },
                update: {},
                create: { id: track.id, eventId, name: track.name, sortOrder: i }
            });
            trackIds.add(track.id);
        }

        // 4. Teams, Participants
        for (const team of data.teams) {
            const creatorId = usersMap.get(team.members[0])!;
            await tx.team.upsert({
                where: { id_eventId: { id: team.id, eventId } },
                update: {},
                create: { id: team.id, eventId, name: team.name, createdById: creatorId }
            });

            for (let i = 0; i < team.members.length; i++) {
                const memberId = usersMap.get(team.members[i])!;
                await tx.teamMember.upsert({
                    where: { teamId_userId: { teamId: team.id, userId: memberId } },
                    update: {},
                    create: { eventId, teamId: team.id, userId: memberId, role: i === 0 ? "OWNER" : "MEMBER" }
                });
                await tx.eventRole.upsert({
                    where: { eventId_userId: { eventId, userId: memberId } },
                    update: {},
                    create: { eventId, userId: memberId, role: "PARTICIPANT" }
                });
            }
        }

        // 5. Judges and Track links
        for (const judge of data.judges) {
            const judgeId = usersMap.get(judge.email)!;
            
            // EventRole
            await tx.eventRole.upsert({
                where: { eventId_userId: { eventId, userId: judgeId } },
                update: {},
                create: { eventId, userId: judgeId, role: "JUDGE" }
            });

            // EventJudgeAccess (Active)
            const access = await tx.eventJudgeAccess.upsert({
                where: { eventId_emailNormalized: { eventId, emailNormalized: judge.email.toLowerCase() } },
                update: {},
                create: {
                    eventId,
                    emailNormalized: judge.email.toLowerCase(),
                    userId: judgeId,
                    status: EventJudgeAccessStatus.ACTIVE,
                    invitedById: adminUserId
                }
            });

            // JudgeTrack
            for (const trackId of judge.tracks) {
                await tx.judgeTrack.upsert({
                    where: { eventId_userId_trackId: { eventId, userId: judgeId, trackId } },
                    update: {},
                    create: { eventId, userId: judgeId, trackId }
                });
                
                await tx.eventJudgeAccessTrack.upsert({
                    where: { accessId_trackId: { accessId: access.id, trackId } },
                    update: {},
                    create: { accessId: access.id, eventId, trackId }
                });
            }
        }

        // 6. Projects
        for (const proj of data.projects) {
            const submittedAt = proj.submitted_at ? new Date(proj.submitted_at) : null;
            const duplicateOf = data.projects.find((p: any) => p !== proj && p.team === proj.team && p.title === proj.title && p.id < proj.id);
            
            await tx.project.upsert({
                where: { id_eventId: { id: proj.id, eventId } },
                update: {},
                create: {
                    id: proj.id,
                    eventId,
                    teamId: proj.team,
                    trackId: proj.track || null,
                    title: proj.title,
                    summary: proj.summary,
                    repoUrl: proj.repo_url,
                    status: submittedAt ? "SUBMITTED" : "DRAFT",
                    submittedAt,
                    duplicateOfId: duplicateOf ? duplicateOf.id : null,
                    source: RecordSource.FIXTURE
                }
            });
        }

        // 7. Legacy evidence
        if (data.scores.length > 0) {
            const sampleScore = data.scores[0];
            const criteriaKeys = Object.keys(sampleScore.criteria);
            for (let i = 0; i < criteriaKeys.length; i++) {
                const key = criteriaKeys[i];
                await tx.criterion.upsert({
                    where: { eventId_key: { eventId, key } },
                    update: {},
                    create: { eventId, key, label: key.charAt(0).toUpperCase() + key.slice(1), sortOrder: i, minScore: 0, maxScore: 5 }
                });
            }
        }

        const criteriaMap = new Map<string, string>();
        const criteria = await tx.criterion.findMany({ where: { eventId } });
        for (const c of criteria) criteriaMap.set(c.key, c.id);
        const judgeIdToUserId = new Map<string, string>();
        for (const j of data.judges) judgeIdToUserId.set(j.id, usersMap.get(j.email)!);

        for (let i = 0; i < data.scores.length; i++) {
            const score = data.scores[i];
            const reviewId = `rev_${String(i + 1).padStart(3, '0')}`;
            const judgeUserId = judgeIdToUserId.get(score.judge)!;
            
            await tx.review.upsert({
                where: { eventId_judgeUserId_projectId: { eventId, judgeUserId, projectId: score.project } },
                update: {},
                create: {
                    id: reviewId,
                    eventId,
                    judgeUserId,
                    projectId: score.project,
                    comment: score.comment || "",
                    source: RecordSource.FIXTURE
                }
            });

            const criteriaKeys = Object.keys(score.criteria);
            for (const key of criteriaKeys) {
                const criterionId = criteriaMap.get(key)!;
                const value = score.criteria[key];
                await tx.criterionScore.upsert({
                    where: { reviewId_criterionId: { reviewId, criterionId } },
                    update: {},
                    create: { eventId, reviewId, criterionId, value }
                });
            }
        }

        // ==========================================
        // 8. Canonical Modern Stage Projection
        // ==========================================
        
        if (!fixtureImport) {
            fixtureImport = await tx.fixtureImport.create({
                data: {
                    sourceName: 'fixtures.json',
                    sourceSha256: fixturesHash,
                    counts: {
                        tracks: data.tracks.length,
                        judges: data.judges.length,
                        teams: data.teams.length,
                        projects: data.projects.length,
                        scores: data.scores.length
                    },
                    rawPayload: data
                }
            });
        }
        
        // Generate deterministic Stage ID based on version
        const stageId = crypto.createHash('sha256').update(`stage:${eventId}:${fixturesHash}:${PROJECTION_VERSION}`).digest('hex').substring(0, 25);
        
        const stage = await tx.judgingStage.upsert({
            where: { fixtureImportId: fixtureImport.id },
            update: {},
            create: {
                id: stageId,
                eventId,
                name: "Imported fixture reviews",
                state: "CLOSED",
                scopeKey: eventId,
                requiredReviews: 1, // Will be labelled UNKNOWN in UI
                origin: RecordSource.FIXTURE,
                fixtureImportId: fixtureImport.id
            }
        });

        // Active Rubric
        const rubricHash = crypto.createHash('sha256').update(`rubric:${stage.id}`).digest('hex');
        let activeRubric = await tx.rubricVersion.findFirst({ where: { stageId: stage.id } });
        if (!activeRubric) {
            activeRubric = await tx.rubricVersion.create({
                data: { stageId: stage.id, versionHash: rubricHash }
            });
            
            // 3333, 3333, 3334 basis points
            const rubricCriteria = [
                { key: 'functionality', title: 'Functionality', weightBasisPts: 3333, maxScore: 5, sortOrder: 0 },
                { key: 'quality', title: 'Quality', weightBasisPts: 3333, maxScore: 5, sortOrder: 1 },
                { key: 'innovation', title: 'Innovation', weightBasisPts: 3334, maxScore: 5, sortOrder: 2 }
            ];
            
            for (const rc of rubricCriteria) {
                await tx.rubricCriterion.create({
                    data: { ...rc, rubricVersionId: activeRubric.id }
                });
            }
            
            await tx.judgingStage.update({
                where: { id: stage.id },
                data: { activeRubricVersionId: activeRubric.id }
            });
        }

        // Modern StageProjects
        for (const proj of data.projects) {
            await tx.stageProject.upsert({
                where: { stageId_projectId: { stageId: stage.id, projectId: proj.id } },
                update: {},
                create: { stageId: stage.id, projectId: proj.id, eventId, versionSnapshot: 1, projectSnapshot: { title: proj.title } }
            });
        }

        // Modern StageJudges
        for (const judge of data.judges) {
            const judgeUserId = usersMap.get(judge.email)!;
            await tx.stageJudge.upsert({
                where: { stageId_judgeUserId: { stageId: stage.id, judgeUserId } },
                update: {},
                create: { stageId: stage.id, judgeUserId, isActive: true }
            });
        }
        
        // Modern Assignment Run (Deterministic)
        const runId = crypto.createHash('sha256').update(`run:${stage.id}:${PROJECTION_VERSION}`).digest('hex').substring(0, 25);
        await tx.assignmentRun.upsert({
            where: { stageId_version: { stageId: stage.id, version: 1 } },
            update: {},
            create: {
                id: runId,
                stageId: stage.id,
                version: 1,
                configHash: "FIXTURE_IMPORT",
                inputHash: fixturesHash,
                reason: "Fixture Projection"
            }
        });
        
        // Modern Assignments & Reviews
        const rubricCriteriaRows = await tx.rubricCriterion.findMany({ where: { rubricVersionId: activeRubric.id } });
        const rcMap = new Map(rubricCriteriaRows.map(rc => [rc.key.toLowerCase(), rc.id]));
        
        for (let i = 0; i < data.scores.length; i++) {
            const score = data.scores[i];
            const judgeUserId = judgeIdToUserId.get(score.judge)!;
            const sourceRecordKey = `scores:${i}`;
            
            // Assignment
            const assignment = await tx.rubricAssignment.upsert({
                where: { stageId_projectId_judgeUserId: { stageId: stage.id, projectId: score.project, judgeUserId } },
                update: {},
                create: {
                    stageId: stage.id,
                    projectId: score.project,
                    judgeUserId,
                    runId,
                    status: AssignmentStatus.COMPLETED
                }
            });

            // Modern Review
            let stageReview = await tx.stageReview.findUnique({
                where: { fixtureImportId_sourceRecordKey: { fixtureImportId: fixtureImport.id, sourceRecordKey } }
            });
            
            if (!stageReview) {
                stageReview = await tx.stageReview.create({
                    data: {
                        assignmentId: assignment.id,
                        rubricVersionId: activeRubric.id,
                        comment: score.comment || "",
                        origin: RecordSource.FIXTURE,
                        fixtureImportId: fixtureImport.id,
                        sourceRecordKey,
                        importedAt: new Date(),
                        submittedAt: null // Unknown original submittedAt
                    }
                });
                
                // Scores
                for (const [key, value] of Object.entries(score.criteria)) {
                    const criterionId = rcMap.get(key.toLowerCase());
                    if (criterionId) {
                        await tx.stageCriterionScore.create({
                            data: {
                                reviewId: stageReview.id,
                                criterionId,
                                value: value as number
                            }
                        });
                    }
                }
            }
        }

    }, { timeout: 180000 });
}
