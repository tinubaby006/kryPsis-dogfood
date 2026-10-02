import { ShieldCheck, AlertCircle, Activity, PlayCircle, Lock } from "lucide-react";

export function EventReadinessPanel({ event, submissionsExist }: { event: any, submissionsExist: boolean }) {
    const now = new Date();
    const isClosed = event.submissionsCloseAt && now > new Date(event.submissionsCloseAt);
    const isOpen = !isClosed && event.submissionsOpenAt && now >= new Date(event.submissionsOpenAt);
    const eventState = isClosed ? "CLOSED" : isOpen ? "OPEN" : "DRAFT";

    const hasTracks = event.tracks.length > 0;
    const hasJudges = event.judgeAccesses?.length > 0;
    const hasStages = event.judgingStages?.length > 0;
    const activeStage = event.judgingStages?.find((s: any) => ["CONFIGURED", "ASSIGNING", "OPEN"].includes(s.state));

    return (
        <div className="bg-card border-l-4 border-l-primary p-6 rounded-xl border-y border-r border-border shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold font-heading">Event Readiness & State</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    eventState === 'CLOSED' ? 'bg-warning/20 text-warning' :
                    eventState === 'OPEN' ? 'bg-success/20 text-success' :
                    'bg-muted text-muted-foreground'
                }`}>
                    {eventState === 'CLOSED' ? 'Submissions Closed' : eventState === 'OPEN' ? 'Submissions Open' : 'Pre-Submissions Draft'}
                </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Configuration Progress</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            {event.visibility === 'PUBLIC' ? <ShieldCheck className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                            <span>Visibility: {event.visibility}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            {hasTracks ? <ShieldCheck className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                            <span>{hasTracks ? `${event.tracks.length} Tracks Configured` : "No Tracks (Single Pool)"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            {hasJudges ? <ShieldCheck className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                            <span>{hasJudges ? 'Judges Invited' : 'No Judges Invited'}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            {hasStages ? <ShieldCheck className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                            <span>{hasStages ? `${event.judgingStages.length} Judging Stages` : 'No Judging Stages Configured'}</span>
                        </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-4 italic">
                        Note: Configuration progress is not judging completion.
                    </p>
                </div>

                <div className="border-l border-border pl-6">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">What Remains Editable</h3>
                    <ul className="space-y-2 text-sm text-foreground">
                        <li className="flex items-center gap-2">
                            {submissionsExist ? <Lock className="w-4 h-4 text-destructive-text" /> : <PlayCircle className="w-4 h-4 text-success" />}
                            <span className={submissionsExist ? 'line-through text-muted-foreground' : ''}>Event Details & Custom Questions</span>
                        </li>
                        <li className="flex items-center gap-2">
                            {activeStage ? <Lock className="w-4 h-4 text-destructive-text" /> : <PlayCircle className="w-4 h-4 text-success" />}
                            <span className={activeStage ? 'line-through text-muted-foreground' : ''}>Stage Architecture & Rubrics</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <PlayCircle className="w-4 h-4 text-success" />
                            <span>Judge Invitations & Tracking</span>
                        </li>
                    </ul>

                    <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg">
                        <h4 className="text-xs font-bold mb-1">Next Action</h4>
                        <p className="text-sm text-primary font-medium">
                            {!hasJudges ? "Invite judges to review projects." : 
                             !hasStages ? "Create a Judging Stage to assign rubrics." :
                             !isClosed ? "Wait for submissions to close before finalizing judging." :
                             "Monitor active judging stages."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
