import { Prisma } from "@prisma/client";

// Define the shape of a Project with relations
type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    team: {
      include: {
        members: {
          include: { user: true }
        }
      }
    };
    track: true;
    assets: true;
    answers: {
      include: {
        question: true
      }
    };
    reviews: {
      include: {
        judge: true;
        scores: true;
      }
    }
  }
}>;

export function toPublicProjectDTO(project: ProjectWithRelations) {
  return {
    id: project.id,
    eventId: project.eventId,
    title: project.title,
    summary: project.summary,
    description: project.description,
    repoUrl: project.repoUrl,
    liveUrl: project.liveUrl,
    demoVideoUrl: project.demoVideoUrl,
    techTags: project.techTags,
    status: project.status,
    submittedAt: project.submittedAt,
    duplicateOfId: project.duplicateOfId,
    track: project.track ? {
        id: project.track.id,
        name: project.track.name
    } : null,
    team: {
        id: project.team.id,
        name: project.team.name,
        // Exclude emails
        members: project.team.members.map(m => ({
            userId: m.userId,
            name: m.user.name,
            role: m.role,
            image: m.user.image
        }))
    },
    assets: project.assets.map(a => ({
        kind: a.kind,
        storageKey: a.storageKey,
        originalName: a.originalName,
        mimeType: a.mimeType
    })),
    // Exclude private custom answers
    publicAnswers: project.answers
        .filter(a => a.question.isPublic)
        .map(a => ({
            questionId: a.question.id,
            questionLabel: a.question.label,
            value: a.value
        }))
    // EXCLUDE SCORES: `reviews` are intentionally omitted from this DTO
  };
}
