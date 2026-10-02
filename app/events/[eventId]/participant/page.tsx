import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TeamInviteManager } from "./TeamInviteManager";

export default async function TeamDashboardPage({ params }: { params: Promise<{ eventId: string }> }) {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const { eventId } = await params;

    let event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
        event = await prisma.event.findUnique({ where: { slug: eventId } });
        if (!event) notFound();
    }

    const member = await prisma.teamMember.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
        include: {
            team: {
                include: {
                    members: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    invites: {
                        where: { revokedAt: null, expiresAt: { gt: new Date() }, uses: { lt: prisma.teamInvite.fields.maxUses } }
                    }
                }
            }
        }
    });

    if (!member) {
        return (
            <div className="py-12 px-4 max-w-4xl mx-auto text-center">
                <div className="bg-card border border-border border-dashed p-10 rounded-xl">
                    <p className="mb-4 text-muted-foreground font-medium">You are not in a team for this event.</p>
                    <Link href={`/events/${event.id}`} className="text-primary hover:text-primary-hover font-medium">Go to Event Page</Link>
                </div>
            </div>
        );
    }

    const team = member.team;
    const isOwner = member.role === "OWNER";

    return (
        <div className="py-8 px-4 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-heading text-foreground">{team.name}</h1>
                <div className="flex gap-3">
                    <Link href={`/events/${event.id}/participant/project`} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors text-sm shadow-sm">Submit / Edit Project</Link>
                    <Link href={`/events/${event.id}`} className="bg-card border border-border text-foreground px-4 py-2.5 rounded-md font-medium hover:bg-muted transition-colors text-sm shadow-sm">Back to Event</Link>
                </div>
            </div>

            <div className="bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border mb-10">
                <h2 className="text-xl font-bold mb-6 font-heading border-b border-border pb-3 text-foreground">Team Members ({team.members.length} / {event.maxTeamSize})</h2>
                <ul className="divide-y divide-border">
                    {team.members.map(m => (
                        <li key={m.id} className="py-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">{m.user.name}</p>
                                <p className="text-sm text-muted-foreground">{m.user.email}</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded border uppercase font-bold tracking-wider ${m.role === 'OWNER' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                {m.role}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {isOwner && (
                <TeamInviteManager 
                    teamId={team.id} 
                    eventId={event.id} 
                    activeInvites={team.invites} 
                />
            )}
        </div>
    );
}
