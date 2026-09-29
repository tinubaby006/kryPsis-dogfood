import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireJudgeAccess } from "@/lib/judging/auth";
import { toPublicProjectDTO } from "@/lib/dtos";
import { ReviewForm } from "./ReviewForm";
import { Calendar, ChevronLeft } from "lucide-react";

export default async function AssignmentPage({ params }: { params: Promise<{ eventId: string, assignmentId: string }> }) {
    const { eventId, assignmentId } = await params;
    
    // Auth & Validation
    let authContext;
    try {
        authContext = await requireJudgeAccess(eventId, assignmentId);
    } catch (e: any) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                {e.message}
            </div>
        );
    }

    const assignment = authContext.assignment!;
    const stage = authContext.stage!;

    // Fetch the project data as it currently exists (the snapshot is handled by stageProject logically holding version limits, but for hackathon we fetch current if within snapshot)
    const rawProject = await prisma.project.findUnique({
        where: { id: assignment.projectId },
        include: {
            team: { include: { members: { include: { user: true } } } },
            track: true,
            assets: true,
            answers: { include: { question: true } },
            // Intentional omission of reviews to prevent score leakage
        }
    });

    if (!rawProject) notFound();
    const p = toPublicProjectDTO(rawProject as any);

    // Fetch the frozen rubric version for this stage
    const rubricVersion = await prisma.rubricVersion.findFirst({
        where: { stageId: stage.id },
        include: { criteria: true },
        orderBy: { createdAt: 'desc' }
    });

    if (!rubricVersion) {
        return <div className="p-8 text-red-600">Configuration Error: No rubric found for this stage.</div>;
    }

    // Fetch assignment data (draft, final review)
    const assignmentWithData = await prisma.rubricAssignment.findUnique({
        where: { id: assignmentId },
        include: { reviewDraft: true, finalReview: { include: { scores: true } } }
    });

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <Link href={`/events/${eventId}/judge`} className="text-blue-600 hover:underline font-medium flex items-center gap-1 mb-4">
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Reviewing: {p.title}</h1>
                    <div className="flex gap-4 text-sm text-gray-600">
                        <span>Stage: <strong>{stage.name}</strong></span>
                        {stage.startsAt && stage.endsAt && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> {stage.startsAt.toLocaleDateString()} - {stage.endsAt.toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column: Project Snapshot */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-6 border-b bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">Project Details</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">{p.summary}</p>
                            
                            <h3 className="font-bold text-gray-900 mt-6 mb-2">Description</h3>
                            <div className="prose max-w-none text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                                {p.description}
                            </div>

                            {p.demoVideoUrl && (
                                <div className="mt-6">
                                    <h3 className="font-bold text-gray-900 mb-2">Demo Video</h3>
                                    <a href={p.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-sm">
                                        {p.demoVideoUrl}
                                    </a>
                                </div>
                            )}

                            {p.assets.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-bold text-gray-900 mb-3">Gallery</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {p.assets.map((a: any) => (
                                            <div key={a.storageKey} className="aspect-video relative rounded overflow-hidden border">
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

                            <div className="mt-6 pt-6 border-t">
                                <h3 className="font-bold text-gray-900 mb-3">Links</h3>
                                <ul className="space-y-2 text-sm">
                                    {p.repoUrl && <li><a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Source Code Repository</a></li>}
                                    {p.liveUrl && <li><a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Live Application</a></li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Rubric Review Workbench */}
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl shadow-sm border overflow-hidden sticky top-6">
                        <div className="p-6 border-b bg-white flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Rubric Form</h2>
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                v{rubricVersion.id.slice(-6)}
                            </span>
                        </div>
                        <div className="p-6">
                            <ReviewForm 
                                eventId={eventId} 
                                assignmentId={assignmentId} 
                                rubric={rubricVersion}
                                draft={assignmentWithData?.reviewDraft}
                                finalReview={assignmentWithData?.finalReview}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
