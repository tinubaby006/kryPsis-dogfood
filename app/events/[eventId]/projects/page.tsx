import { prisma } from "@/lib/db";
import { toPublicProjectDTO } from "@/lib/dtos";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PublicProjectsGallery({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    
    const event = await prisma.event.findUnique({
        where: { id: eventId }
    });
    if (!event) return notFound();

    const rawProjects = await prisma.project.findMany({
        where: { eventId, status: "SUBMITTED" },
        include: {
            team: { include: { members: { include: { user: true } } } },
            track: true,
            assets: true,
            answers: { include: { question: true } },
            reviews: { include: { judge: true, scores: true } }
        },
        orderBy: { submittedAt: 'desc' }
    });

    const projects = rawProjects.map(toPublicProjectDTO);

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{event.name} - Project Gallery</h1>
                <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline">
                    Back to Event
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border rounded-lg">
                    <p className="text-gray-500">No projects have been submitted yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <div key={p.id} className="border rounded-lg overflow-hidden shadow-sm flex flex-col">
                            {p.assets.find(a => a.kind === "THUMBNAIL") ? (
                                <img 
                                    src={`/api/assets/${p.assets.find(a => a.kind === "THUMBNAIL")?.storageKey}`} 
                                    alt={p.title} 
                                    className="w-full h-48 object-cover"
                                />
                            ) : (
                                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                                    No Thumbnail
                                </div>
                            )}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold mb-1">{p.title}</h3>
                                <p className="text-sm text-gray-500 mb-2">by {p.team.name}</p>
                                {p.track && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-3">{p.track.name}</span>}
                                <p className="text-gray-700 text-sm mb-4 flex-1 line-clamp-3">{p.summary}</p>
                                
                                <div className="flex space-x-3 text-sm">
                                    {p.liveUrl && <a href={p.liveUrl} target="_blank" className="text-blue-600 hover:underline">Live Demo</a>}
                                    {p.repoUrl && <a href={p.repoUrl} target="_blank" className="text-blue-600 hover:underline">Repository</a>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
