import { prisma } from "@/lib/db";
import { toPublicProjectDTO } from "@/lib/dtos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function ProjectDetailPage({ params }: { params: Promise<{ eventId: string, projectId: string }> }) {
    const { eventId, projectId } = await params;
    
    const session = await getSession();
    let isOrganizer = false;
    
    if (session?.user) {
        const orgRole = await prisma.eventRole.findUnique({
            where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
        });
        isOrganizer = !!orgRole;
        if (!isOrganizer) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id }});
            isOrganizer = !!user?.isPlatformAdmin;
        }
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return notFound();

    const rawProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            team: { include: { members: { include: { user: true } } } },
            track: true,
            assets: true,
            answers: { include: { question: true } },
            reviews: { include: { judge: true, scores: true } }
        }
    });

    if (!rawProject || rawProject.eventId !== eventId || rawProject.status !== "SUBMITTED") {
        return notFound();
    }

    const p = toPublicProjectDTO(rawProject);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="mb-6">
                <Link href={`/events/${eventId}/projects`} className="text-primary hover:text-primary-hover font-medium flex items-center gap-2">
                    &larr; Back to Gallery
                </Link>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Header Section */}
                <div className="p-8 border-b border-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-extrabold text-card-foreground font-heading mb-2">{p.title}</h1>
                            <p className="text-lg text-muted-foreground mb-4">{p.summary}</p>
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-foreground">Team {p.team.name}</span>
                                {p.track && <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-medium">{p.track.name}</span>}
                            </div>
                        </div>
                        {isOrganizer && p.duplicateOfId && (
                            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20">
                                <p className="font-bold text-sm">Diagnostic Alert</p>
                                <p className="text-xs">Duplicate of: {p.duplicateOfId}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Section */}
                <div className="bg-muted/20 border-b border-border">
                    {p.demoVideoUrl && (
                        <div className="p-8 border-b border-border">
                            <h3 className="font-bold text-card-foreground mb-4 text-lg">Demo Video</h3>
                            <a href={p.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover hover:underline break-all">
                                {p.demoVideoUrl}
                            </a>
                        </div>
                    )}
                    
                    {p.assets.length > 0 && (
                        <div className="p-8">
                            <h3 className="font-bold text-card-foreground mb-4 text-lg">Gallery</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {p.assets.map((a: any) => (
                                    <div key={a.storageKey} className="aspect-video relative rounded overflow-hidden border border-border">
                                        <img 
                                            src={`/api/assets/${a.storageKey}`} 
                                            alt={a.originalName} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Description Section */}
                <div className="p-8 border-b border-border">
                    <h3 className="font-bold text-card-foreground mb-4 text-lg">Description</h3>
                    <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                        {p.description}
                    </div>
                </div>

                {/* Tech Tags & Links */}
                <div className="p-8 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
                    <div>
                        <h3 className="font-bold text-card-foreground mb-3 text-lg">Built With</h3>
                        <div className="flex flex-wrap gap-2">
                            {p.techTags.length > 0 ? p.techTags.map((t: string) => (
                                <span key={t} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium border border-border">
                                    {t}
                                </span>
                            )) : <span className="text-muted-foreground italic">No technologies listed</span>}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-card-foreground mb-3 text-lg">Links</h3>
                        <div className="flex flex-col gap-2">
                            {p.repoUrl ? (
                                <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover hover:underline font-medium">Source Code Repository</a>
                            ) : <span className="text-muted-foreground italic">No repository provided</span>}
                            {p.liveUrl ? (
                                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover hover:underline font-medium">Live Application</a>
                            ) : <span className="text-muted-foreground italic">No live link provided</span>}
                        </div>
                    </div>
                </div>

                {/* Custom Questions Section */}
                {p.publicAnswers && p.publicAnswers.length > 0 && (
                    <div className="p-8">
                        <h3 className="font-bold text-card-foreground mb-4 text-lg">Additional Information</h3>
                        <dl className="space-y-4">
                            {p.publicAnswers.map((ans: any) => (
                                <div key={ans.questionId}>
                                    <dt className="font-semibold text-muted-foreground">{ans.questionLabel}</dt>
                                    <dd className="mt-1 text-foreground">{ans.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </div>
        </div>
    );
}
