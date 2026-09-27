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
            <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
                <p className="mb-4">You are not in a team for this event.</p>
                <Link href={`/events/${event.id}`} className="text-blue-600 hover:underline">Go to Event Page</Link>
            </div>
        );
    }

    const team = member.team;
    const isOwner = member.role === "OWNER";

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <div className="space-x-4">
                    <Link href={`/events/${event.id}/team/project`} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Submit / Edit Project</Link>
                    <Link href={`/events/${event.id}`} className="text-blue-600 hover:underline">Back to Event</Link>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-bold mb-4">Team Members ({team.members.length} / {event.maxTeamSize})</h2>
                <ul className="divide-y">
                    {team.members.map(m => (
                        <li key={m.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{m.user.name}</p>
                                <p className="text-sm text-gray-500">{m.user.email}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${m.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
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
