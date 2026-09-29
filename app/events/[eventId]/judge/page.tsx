import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireJudgeAccess } from "@/lib/judging/auth";
import { AlertCircle, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";

export default async function JudgeHomePage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const session = await getSession();
    
    if (!session?.user) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                401 UNAUTHORIZED: Please log in.
            </div>
        );
    }

    try {
        await requireJudgeAccess(eventId);
    } catch (e: any) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                {e.message}
            </div>
        );
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) notFound();

    // Fetch assignments for this judge
    const assignments = await prisma.rubricAssignment.findMany({
        where: { stage: { eventId }, judgeUserId: session.user.id },
        include: {
            stage: true,
            project: true,
            reviewDraft: true,
            finalReview: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const activeStages = await prisma.judgingStage.findMany({
        where: { eventId, judges: { some: { judgeUserId: session.user.id, isActive: true } } },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Judging Dashboard</h1>
            <p className="text-gray-600 mb-8">{event.name}</p>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Your Stages
                        </h2>
                        {activeStages.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No active judging stages for you.</p>
                        ) : (
                            <ul className="space-y-4">
                                {activeStages.map(stage => {
                                    const stageAssignments = assignments.filter(a => a.stageId === stage.id);
                                    const completed = stageAssignments.filter(a => a.finalReview).length;
                                    const total = stageAssignments.length;
                                    const isSubmittable = stage.state === "OPEN";

                                    return (
                                        <li key={stage.id} className="border-b pb-3 last:border-0 last:pb-0">
                                            <div className="font-medium text-gray-900 flex justify-between items-center">
                                                {stage.name}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSubmittable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {stage.state}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                                <span>Progress: {completed} / {total}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-lg">Your Assignments</h2>
                        </div>
                        
                        {assignments.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>You have no pending assignments.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {assignments.map(a => {
                                    const hasFinal = !!a.finalReview;
                                    const hasDraft = !!a.reviewDraft;
                                    const isOpen = a.stage.state === "OPEN";
                                    
                                    return (
                                        <li key={a.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{a.project.title}</h3>
                                                    <p className="text-sm text-gray-600 mb-2">Stage: {a.stage.name}</p>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {hasFinal ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">
                                                                <CheckCircle2 className="w-3 h-3" /> Submitted
                                                            </span>
                                                        ) : hasDraft ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                                                <Clock className="w-3 h-3" /> Draft Saved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                                <Circle className="w-3 h-3" /> Pending
                                                            </span>
                                                        )}
                                                        
                                                        {!isOpen && !hasFinal && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded">
                                                                <AlertCircle className="w-3 h-3" /> Stage {a.stage.state}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <Link 
                                                    href={`/events/${eventId}/judge/assignments/${a.id}`}
                                                    className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                                                        hasFinal ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 
                                                        !isOpen ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none' :
                                                        'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                    }`}
                                                >
                                                    {hasFinal ? 'View Review' : 'Judge Project'}
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
