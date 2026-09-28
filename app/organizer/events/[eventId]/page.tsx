import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AddTrackForm, AddQuestionForm, AddPrizeForm, TrackItem, QuestionItem, PrizeItem, EditEventDetailsForm } from "./OrganizerForms";
import { JudgesSection } from "./JudgesSection";
import { Settings, Info, ListChecks, Trophy, ClipboardList } from "lucide-react";

export default async function EventSettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const { eventId } = await params;
    
    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
    });

    if (!isOrg) {
        return <div className="p-10 text-destructive-text font-medium bg-destructive/10 border border-destructive/20 rounded-md">Access Denied. You are not an organizer for this event.</div>;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true, prizes: true, customQuestions: true, _count: { select: { projects: true } } }
    });

    if (!event) notFound();

    const submissionsExist = event._count.projects > 0;

    return (
        <div className="py-6 w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
                    <Settings className="w-8 h-8 text-primary" /> {event.name}
                </h1>
                <Link href="/organizer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 border border-border rounded-md hover:bg-muted">
                    Back to Events
                </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Event Details Section */}
                    <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
                            <Info className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold font-heading">Event Details</h2>
                        </div>
                        <EditEventDetailsForm 
                            event={{
                                id: event.id,
                                name: event.name,
                                visibility: event.visibility,
                                maxTeamSize: event.maxTeamSize,
                                submissionsCloseAt: event.submissionsCloseAt,
                                timeZone: event.timeZone
                            }} 
                        />
                    </div>

                    {/* Tracks Section */}
                    <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ListChecks className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold font-heading">Tracks</h2>
                            </div>
                            <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-semibold text-muted-foreground">{event.tracks.length}</span>
                        </div>
                        <ul className="list-none space-y-3 mb-6">
                            {event.tracks.map(t => <TrackItem key={t.id} track={t} eventId={event.id} />)}
                        </ul>
                        <div className="pt-2">
                            <AddTrackForm eventId={event.id} />
                        </div>
                    </div>

                    <JudgesSection eventId={event.id} tracks={event.tracks} />
                </div>

                <div className="space-y-8">
                    {/* Custom Questions Section */}
                    <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold font-heading">Custom Questions</h2>
                            </div>
                            <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-semibold text-muted-foreground">{event.customQuestions.length}</span>
                        </div>
                        
                        {submissionsExist ? (
                            <p className="text-xs text-warning border border-warning/20 bg-warning/10 p-3 rounded-md font-medium mb-5">Submissions exist. Structural edits are frozen.</p>
                        ) : (
                            <p className="text-xs text-success border border-success/20 bg-success/10 p-3 rounded-md font-medium mb-5">No submissions yet. You may add or remove questions.</p>
                        )}
                        
                        <ul className="list-none space-y-3 mb-6">
                            {event.customQuestions.map(q => (
                                <QuestionItem key={q.id} question={q} eventId={event.id} disabled={submissionsExist} />
                            ))}
                        </ul>
                        <div className="pt-2">
                            <AddQuestionForm eventId={event.id} disabled={submissionsExist} />
                        </div>
                    </div>

                    {/* Prizes Section */}
                    <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold font-heading">Prizes</h2>
                            </div>
                            <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-semibold text-muted-foreground">{event.prizes.length}</span>
                        </div>
                        <ul className="list-none space-y-3 mb-6">
                            {event.prizes.map(p => (
                                <PrizeItem key={p.id} prize={{...p, amount: p.amount ? p.amount.toString() : null}} eventId={event.id} />
                            ))}
                        </ul>
                        <div className="pt-2">
                            <AddPrizeForm eventId={event.id} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
