import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, PlusCircle, Shield, Briefcase, Users, LayoutDashboard, ArrowRight, Calendar } from "lucide-react";
import { EventDateFormatter } from "../components/EventDateFormatter";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            proposals: {
                orderBy: { submittedAt: "desc" }
            }
        }
    });

    if (!user) redirect("/sign-in");

    // Fetch all roles for this user
    const roles = await prisma.eventRole.findMany({
        where: { userId: session.user.id },
        include: { event: true }
    });

    // Group by Event
    const eventsMap = new Map<string, { event: any, roles: string[] }>();
    for (const r of roles) {
        if (!eventsMap.has(r.eventId)) {
            eventsMap.set(r.eventId, { event: r.event, roles: [] });
        }
        eventsMap.get(r.eventId)!.roles.push(r.role);
    }

    const memberships = Array.from(eventsMap.values()).sort((a, b) => {
        return new Date(b.event.startsAt || 0).getTime() - new Date(a.event.startsAt || 0).getTime();
    });

    const participantEventIds = memberships.filter(m => m.roles.includes("PARTICIPANT")).map(m => m.event.id);
    let userTeams: any[] = [];
    if (participantEventIds.length > 0) {
        userTeams = await prisma.teamMember.findMany({
            where: { userId: session.user.id, eventId: { in: participantEventIds } },
            include: { team: { include: { projects: { select: { id: true, submittedAt: true } } } } }
        });
    }

    const judgeEventIds = memberships.filter(m => m.roles.includes("JUDGE")).map(m => m.event.id);
    let pendingReviewsCountByEvent: Record<string, number> = {};
    if (judgeEventIds.length > 0) {
        const pendingAssignments = await prisma.rubricAssignment.findMany({
            where: {
                judgeUserId: session.user.id,
                stage: { eventId: { in: judgeEventIds } },
                status: "PENDING"
            },
            include: { stage: { select: { eventId: true } } }
        });
        for (const pa of pendingAssignments) {
            pendingReviewsCountByEvent[pa.stage.eventId] = (pendingReviewsCountByEvent[pa.stage.eventId] || 0) + 1;
        }
    }

    return (
        <div className="py-10 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border pb-6">
                <div>
                    <h1 className="text-4xl font-bold font-heading text-foreground mb-2 flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" /> My Activity
                    </h1>
                    <p className="text-muted-foreground">Welcome back, {user.name}.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {user.isPlatformAdmin && (
                        <Link href="/admin" className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-md hover:bg-secondary/80 border border-border flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Platform Admin
                        </Link>
                    )}
                    <Link href="/organizer/events/new" className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary-hover flex items-center gap-2 shadow-sm">
                        <PlusCircle className="w-4 h-4" /> Propose Event
                    </Link>
                    <form action="/api/auth/sign-out" method="POST">
                        <button type="submit" className="px-4 py-2 border border-border text-foreground font-medium rounded-md hover:bg-muted transition-colors flex items-center gap-2">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </form>
                </div>
            </div>

            {user.proposals && user.proposals.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4 font-heading flex items-center gap-2 border-b border-border pb-2">
                        <PlusCircle className="w-5 h-5 text-primary" /> Your Event Proposals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {user.proposals.map(p => (
                            <div key={p.id} className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-foreground truncate" title={p.name}>{p.name}</h3>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            p.status === 'APPROVED' ? 'bg-success/20 text-success' :
                                            p.status === 'REJECTED' ? 'bg-destructive/20 text-destructive' :
                                            p.status === 'WITHDRAWN' ? 'bg-muted text-muted-foreground' :
                                            'bg-warning/20 text-warning'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </div>
                                </div>
                                {p.status === 'APPROVED' && p.approvedEventId && (
                                    <Link href={`/organizer/events/${p.approvedEventId}`} className="text-sm text-primary hover:underline font-medium mt-3 inline-flex items-center gap-1">
                                        Manage Event <ArrowRight className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-xl font-bold mb-4 font-heading flex items-center gap-2 border-b border-border pb-2">
                    <Calendar className="w-5 h-5 text-primary" /> Event Memberships
                </h2>
                
                {memberships.length === 0 ? (
                    <div className="bg-card border border-border border-dashed p-10 rounded-xl text-center shadow-sm">
                        <LayoutDashboard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-foreground mb-2">No Active Memberships</h3>
                        <p className="text-muted-foreground mb-6">You are not participating, organizing, or judging any active events.</p>
                        <div className="flex justify-center gap-4">
                            <Link href="/events" className="text-primary hover:underline font-medium">Browse Events</Link>
                            <span className="text-muted-foreground">•</span>
                            <Link href="/organizer/events/new" className="text-primary hover:underline font-medium">Propose Event</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {memberships.map((m) => {
                            const event = m.event;
                            const isParticipant = m.roles.includes("PARTICIPANT");
                            const isJudge = m.roles.includes("JUDGE");
                            const isOrganizer = m.roles.includes("ORGANIZER");

                            const teamMember = userTeams.find(t => t.eventId === event.id);
                            const hasProject = teamMember?.team?.projects && teamMember.team.projects.length > 0;
                            const isSubmitted = hasProject && teamMember.team.projects.some((p: any) => p.submittedAt);
                            const pendingReviewsCount = pendingReviewsCountByEvent[event.id] || 0;

                            const isClosed = new Date() > event.submissionsCloseAt;
                            let eventStatus = isClosed ? "Closed" : "Open";

                            return (
                                <div key={event.id} className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-6 hover:border-primary/30 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-foreground">
                                                <Link href={`/events/${event.slug}`} className="hover:text-primary transition-colors">{event.name}</Link>
                                            </h3>
                                            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-semibold uppercase">{eventStatus}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-4">
                                            <EventDateFormatter 
                                                startsAt={event.startsAt} endsAt={event.endsAt} 
                                                submissionsOpenAt={event.submissionsOpenAt} submissionsCloseAt={event.submissionsCloseAt} 
                                                timeZone={event.timeZone}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4 md:mb-0">
                                            {m.roles.map(role => (
                                                <span key={role} className="text-xs px-2.5 py-1 rounded-full border border-border bg-background font-semibold flex items-center gap-1.5">
                                                    {role === "ORGANIZER" && <Shield className="w-3 h-3 text-warning" />}
                                                    {role === "JUDGE" && <Briefcase className="w-3 h-3 text-primary" />}
                                                    {role === "PARTICIPANT" && <Users className="w-3 h-3 text-success" />}
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center min-w-[200px] border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                                        {isOrganizer && (
                                            <div className="mb-3">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Organizer Action</p>
                                                <Link href={`/organizer/events/${event.id}`} className="text-sm font-medium text-primary hover:underline">Manage Event Setup &rarr;</Link>
                                            </div>
                                        )}
                                        {isJudge && (
                                            <div className="mb-3">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Judge Action</p>
                                                <p className="text-sm text-foreground mb-1">{pendingReviewsCount} pending review{pendingReviewsCount !== 1 ? 's' : ''}</p>
                                                <Link href={`/events/${event.id}/judge`} className="text-sm font-medium text-primary hover:underline">Enter Workbench &rarr;</Link>
                                            </div>
                                        )}
                                        {isParticipant && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Participant Action</p>
                                                <p className="text-sm text-foreground mb-1">
                                                    {!teamMember ? "Not in a team" : !hasProject ? "No draft project" : isSubmitted ? "Project submitted" : "Draft in progress"}
                                                </p>
                                                <Link href={`/events/${event.id}/participant`} className="text-sm font-medium text-primary hover:underline">Go to Workspace &rarr;</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
