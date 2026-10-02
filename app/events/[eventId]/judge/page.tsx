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
            <div className="p-8 text-center text-destructive font-bold bg-destructive/10 border border-destructive/20 rounded-md">
                401 UNAUTHORIZED: Please log in.
            </div>
        );
    }

    let authContext;
    try {
        authContext = await requireJudgeAccess(eventId);
    } catch (e: any) {
        return (
            <div className="p-8 text-center text-destructive font-bold bg-destructive/10 border border-destructive/20 rounded-md">
                {e.message}
            </div>
        );
    }

    const resolvedEventId = authContext.resolvedEventId;

    const event = await prisma.event.findUnique({ where: { id: resolvedEventId } });
    if (!event) notFound();

    // Fetch assignments for this judge
    const assignments = await prisma.rubricAssignment.findMany({
        where: { stage: { eventId: resolvedEventId }, judgeUserId: session.user.id },
        include: {
            stage: true,
            project: true,
            reviewDraft: true,
            finalReview: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const activeStages = await prisma.judgingStage.findMany({
        where: { eventId: resolvedEventId, judges: { some: { judgeUserId: session.user.id, isActive: true } } },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-extrabold text-foreground mb-2">Judging Dashboard</h1>
            <p className="text-muted-foreground mb-8">{event.name}</p>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                            <Clock className="w-5 h-5 text-primary" />
                            Your Stages
                        </h2>
                        {activeStages.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No active judging stages for you.</p>
                        ) : (
                            <ul className="space-y-4">
                                {activeStages.map(stage => {
                                    const stageAssignments = assignments.filter(a => a.stageId === stage.id);
                                    const completed = stageAssignments.filter(a => a.finalReview).length;
                                    const total = stageAssignments.length;
                                    const isSubmittable = stage.state === "OPEN";

                                    return (
                                        <li key={stage.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                                            <div className="font-medium text-foreground flex justify-between items-center">
                                                {stage.name}
                                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold border ${isSubmittable ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                                    {stage.state}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                                                <span>Progress: <strong className={completed === total && total > 0 ? 'text-success' : ''}>{completed} / {total}</strong></span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/50 flex justify-between items-center">
                            <h2 className="font-bold text-lg text-foreground">Your Assignments</h2>
                        </div>
                        
                        {assignments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/10">
                                <Circle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-foreground mb-1">No Pending Assignments</h3>
                                <p className="text-sm text-muted-foreground">You currently have no projects assigned to review.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {assignments.map(a => {
                                    const hasFinal = !!a.finalReview;
                                    const hasDraft = !!a.reviewDraft;
                                    const isOpen = a.stage.state === "OPEN";
                                    
                                    return (
                                        <li key={a.id} className="p-6 hover:bg-muted/30 transition-colors">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div>
                                                    <h3 className="font-bold text-foreground text-lg mb-1">{a.project.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-3">Stage: <strong className="text-foreground">{a.stage.name}</strong></p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {hasFinal ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-success/10 text-success border border-success/20 px-2 py-1 rounded">
                                                                <CheckCircle2 className="w-3 h-3" /> Submitted
                                                            </span>
                                                        ) : hasDraft ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-warning/10 text-warning border border-warning/20 px-2 py-1 rounded">
                                                                <Clock className="w-3 h-3" /> Draft Saved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-muted text-muted-foreground border border-border px-2 py-1 rounded">
                                                                <Circle className="w-3 h-3" /> Pending
                                                            </span>
                                                        )}
                                                        
                                                        {!isOpen && !hasFinal && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-destructive/10 text-destructive-text border border-destructive/20 px-2 py-1 rounded">
                                                                <AlertCircle className="w-3 h-3" /> Stage {a.stage.state}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <Link 
                                                    href={`/events/${eventId}/judge/assignments/${a.id}`}
                                                    className={`px-4 py-2 rounded font-medium text-sm transition-colors w-full sm:w-auto text-center focus:ring-2 focus:ring-ring focus:outline-none ${
                                                        hasFinal ? 'bg-muted text-muted-foreground border border-border hover:bg-border/50' : 
                                                        !isOpen ? 'bg-muted/50 text-muted-foreground border border-border/50 cursor-not-allowed pointer-events-none' :
                                                        'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm'
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
