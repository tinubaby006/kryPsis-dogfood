import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreateTeamForm } from "./CreateTeamForm";

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
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
            <div className="flex gap-4 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isClosed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {isClosed ? 'Submissions Closed' : 'Submissions Open'}
                </span>
                <span className="text-gray-600 self-center">
                    Closes: {new Date(event.submissionsCloseAt).toLocaleString()}
                </span>
            </div>

            <p className="text-lg text-gray-700 mb-8">{event.description || "No description provided."}</p>

            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-2xl font-bold mb-4">Participation</h2>
                {!session?.user ? (
                    <div>
                        <p className="mb-4">You must be logged in to participate.</p>
                        <Link href="/sign-in" className="bg-blue-600 text-white px-4 py-2 rounded">Sign In</Link>
                    </div>
                ) : existingTeam ? (
                    <div>
                        <p className="mb-4 text-green-700 font-medium">You are participating with team: {existingTeam.name}</p>
                        <Link href={`/events/${event.id}/team`} className="bg-blue-600 text-white px-4 py-2 rounded inline-block">
                            Go to Team Dashboard
                        </Link>
                    </div>
                ) : isClosed ? (
                    <div className="text-red-600">You cannot create a team because submissions are closed.</div>
                ) : (
                    <div>
                        <p className="mb-2">You are not in a team for this event.</p>
                        <p className="text-sm text-gray-500 mb-4">You can either create a new team, or ask a team owner for an invite link to join theirs.</p>
                        <CreateTeamForm eventId={event.id} />
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Tracks</h2>
                    {event.tracks.length > 0 ? (
                        <ul className="space-y-3">
                            {event.tracks.sort((a:any, b:any) => a.sortOrder - b.sortOrder).map((t:any) => (
                                <li key={t.id} className="p-3 bg-gray-50 border rounded">
                                    <div className="font-semibold">{t.name}</div>
                                    <div className="text-sm text-gray-600">{t.description}</div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No tracks announced yet.</p>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4">Prizes</h2>
                    {event.prizes.length > 0 ? (
                        <ul className="space-y-3">
                            {event.prizes.sort((a:any, b:any) => a.sortOrder - b.sortOrder).map((p:any) => (
                                <li key={p.id} className="p-3 bg-gray-50 border rounded flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold">{p.name}</div>
                                        <div className="text-sm text-gray-600">{p.description}</div>
                                    </div>
                                    {p.amount !== null && (
                                        <div className="font-bold text-green-700">
                                            {p.amount} {p.currency}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No prizes announced yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
