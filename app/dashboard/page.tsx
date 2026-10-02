import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, PlusCircle, Shield, Briefcase, Users, LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            eventRoles: {
                include: { event: true }
            },
            proposals: {
                orderBy: { submittedAt: "desc" }
            }
        }
    });

    if (!user) redirect("/sign-in");

    const organizerEvents = user.eventRoles.filter(r => r.role === "ORGANIZER").map(r => r.event);
    const judgeEvents = user.eventRoles.filter(r => r.role === "JUDGE").map(r => r.event);
    const participantEvents = user.eventRoles.filter(r => r.role === "PARTICIPANT").map(r => r.event);

    return (
        <div className="py-10 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border pb-6">
                <div>
                    <h1 className="text-4xl font-bold font-heading text-foreground mb-2 flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" /> Dashboard
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Event Proposals */}
                {user.proposals && user.proposals.length > 0 && (
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-3">
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
                                        <p className="text-sm text-muted-foreground mb-1">Slug: {p.proposedSlug}</p>
                                    </div>
                                    {p.status === 'APPROVED' && p.approvedEventId && (
                                        <Link href={`/organizer/events/${p.approvedEventId}`} className="text-sm text-primary hover:underline font-medium mt-3 inline-block">
                                            Manage Event &rarr;
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Organizer Roles */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4 font-heading flex items-center gap-2 border-b border-border pb-2">
                        <Shield className="w-5 h-5 text-primary" /> Organizing
                    </h2>
                    {organizerEvents.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">You are not organizing any events.</p>
                    ) : (
                        <ul className="space-y-3">
                            {organizerEvents.map(e => (
                                <li key={e.id}>
                                    <Link href={`/organizer/events/${e.id}`} className="block p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
                                        <div className="font-medium text-foreground">{e.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">Manage Settings & Projects</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Judge Roles */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4 font-heading flex items-center gap-2 border-b border-border pb-2">
                        <Briefcase className="w-5 h-5 text-primary" /> Judging
                    </h2>
                    {judgeEvents.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">You are not judging any events.</p>
                    ) : (
                        <ul className="space-y-3">
                            {judgeEvents.map(e => (
                                <li key={e.id}>
                                    <Link href={`/events/${e.id}/judge`} className="block p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
                                        <div className="font-medium text-foreground">{e.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">Review Assigned Projects</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Participant Roles */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4 font-heading flex items-center gap-2 border-b border-border pb-2">
                        <Users className="w-5 h-5 text-primary" /> Participating
                    </h2>
                    {participantEvents.length === 0 ? (
                        <p className="text-muted-foreground text-sm italic">You are not participating in any events.</p>
                    ) : (
                        <ul className="space-y-3">
                            {participantEvents.map(e => (
                                <li key={e.id}>
                                    <Link href={`/events/${e.id}`} className="block p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
                                        <div className="font-medium text-foreground">{e.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">View Event Portal</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
