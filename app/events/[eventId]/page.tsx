import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreateTeamForm } from "./CreateTeamForm";
import { EventDateFormatter } from "../../components/EventDateFormatter";
import { ArrowRight, Trophy, LayoutGrid, CheckCircle } from "lucide-react";

export default async function PublicEventPage({ params }: { params: Promise<{ eventId: string }> }) {
    const session = await getSession();
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            tracks: true,
            prizes: true
        }
    });

    if (!event) {
        const slugEvent = await prisma.event.findUnique({
            where: { slug: eventId },
            include: { tracks: true, prizes: true }
        });
        if (!slugEvent) notFound();
        return <PublicEventView event={slugEvent} session={session} />;
    }

    return <PublicEventView event={event} session={session} />;
}

async function PublicEventView({ event, session }: { event: any, session: any }) {
    let existingTeam = null;

    if (session?.user) {
        const member = await prisma.teamMember.findUnique({
            where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
            include: { team: true }
        });
        if (member) {
            existingTeam = member.team;
        }
    }

    const isClosed = new Date() > event.submissionsCloseAt;

    return (
        <div className="bg-background min-h-screen">
            {/* Header Banner */}
            <div className="border-b border-border bg-card py-12 md:py-16">
                <div className="container mx-auto px-4 max-w-6xl">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">{event.name}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <EventDateFormatter 
                            startsAt={event.startsAt}
                            endsAt={event.endsAt}
                            submissionsOpenAt={event.submissionsOpenAt}
                            submissionsCloseAt={event.submissionsCloseAt}
                            timeZone={event.timeZone}
                            className="text-lg"
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-10 px-4 max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Left Column: Content */}
                    <div className="flex-1 space-y-12">
                        {/* Description */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4 font-heading text-foreground border-b border-border pb-2">Overview</h2>
                            <div className="prose prose-invert max-w-none text-muted-foreground">
                                <p className="text-lg whitespace-pre-wrap">{event.description || "No description provided."}</p>
                            </div>
                        </section>

                        {/* Tracks */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 font-heading text-foreground border-b border-border pb-2 flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5 text-primary" /> Tracks
                            </h2>
                            {event.tracks.length > 0 ? (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {event.tracks.sort((a:any, b:any) => a.sortOrder - b.sortOrder).map((t:any) => (
                                        <div key={t.id} className="p-5 bg-card border border-border rounded-xl shadow-sm hover:border-primary/30 transition-colors">
                                            <h3 className="font-semibold text-lg text-foreground mb-2">{t.name}</h3>
                                            <p className="text-sm text-muted-foreground">{t.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic bg-muted/50 p-4 rounded-md border border-border">No tracks announced yet.</p>
                            )}
                        </section>

                        {/* Prizes */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 font-heading text-foreground border-b border-border pb-2 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-warning" /> Prizes
                            </h2>
                            {event.prizes.length > 0 ? (
                                <div className="space-y-4">
                                    {event.prizes.sort((a:any, b:any) => a.sortOrder - b.sortOrder).map((p:any) => (
                                        <div key={p.id} className="p-5 bg-card border border-border rounded-xl shadow-sm flex justify-between items-center group hover:border-warning/30 transition-colors">
                                            <div>
                                                <h3 className="font-semibold text-lg text-foreground">{p.name}</h3>
                                                <p className="text-sm text-muted-foreground">{p.description}</p>
                                            </div>
                                            {p.amount !== null && (
                                                <div className="font-bold text-success text-xl px-4 py-2 bg-success/10 rounded-lg border border-success/20">
                                                    {p.amount.toString()} {p.currency}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic bg-muted/50 p-4 rounded-md border border-border">No prizes announced yet.</p>
                            )}
                        </section>
                        
                        {/* Gallery Link (if open) */}
                        <section className="pt-4 border-t border-border">
                            <Link href={`/events/${event.id}/projects`} className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium">
                                <LayoutGrid className="w-4 h-4" /> View Project Gallery <ArrowRight className="w-4 h-4" />
                            </Link>
                        </section>
                    </div>

                    {/* Right Column: Sticky Action Card */}
                    <div className="w-full lg:w-[380px] shrink-0">
                        <div className="sticky top-6">
                            <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-lg">
                                <h2 className="text-2xl font-bold mb-6 font-heading text-foreground">Participation</h2>
                                
                                {!session?.user ? (
                                    <div className="space-y-4">
                                        <p className="text-muted-foreground text-sm">You must be logged in to join a team or submit a project.</p>
                                        <Link href="/sign-in" className="block w-full text-center bg-primary text-primary-foreground px-4 py-3 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm">
                                            Sign In to Participate
                                        </Link>
                                    </div>
                                ) : existingTeam ? (
                                    <div className="space-y-4">
                                        <div className="bg-success/10 border border-success/20 p-4 rounded-md flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-success font-semibold text-sm mb-1">You are participating</p>
                                                <p className="text-success/80 text-xs">Team: {existingTeam.name}</p>
                                            </div>
                                        </div>
                                        <Link href={`/events/${event.id}/participant`} className="block w-full text-center bg-primary text-primary-foreground px-4 py-3 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm">
                                            Go to Participant Workspace
                                        </Link>
                                    </div>
                                ) : isClosed ? (
                                    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md text-destructive-text text-sm font-medium">
                                        Submissions are currently closed. You cannot create or join a team.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Not in a team yet</p>
                                            <p className="text-xs text-muted-foreground mb-4">Create a new team below, or ask a team owner for an invite link to join theirs.</p>
                                            
                                            <div className="pt-2 border-t border-border">
                                                <CreateTeamForm eventId={event.id} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
