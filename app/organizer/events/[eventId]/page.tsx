import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AddTrackForm, AddQuestionForm, AddPrizeForm, TrackItem, QuestionItem, PrizeItem, EditEventDetailsForm } from "./OrganizerForms";

export default async function EventSettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const { eventId } = await params;
    
    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
    });

    if (!isOrg) {
        return <div className="p-10 text-red-600">Access Denied. You are not an organizer for this event.</div>;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true, prizes: true, customQuestions: true, _count: { select: { projects: true } } }
    });

    if (!event) notFound();

    const submissionsExist = event._count.projects > 0;

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Event: {event.name}</h1>
                <Link href="/organizer" className="text-blue-600 hover:underline">Back to Dashboard</Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Event Details</h2>
                        <EditEventDetailsForm 
                            event={{
                                id: event.id,
                                name: event.name,
                                visibility: event.visibility,
                                maxTeamSize: event.maxTeamSize,
                                submissionsCloseAt: event.submissionsCloseAt
                            }} 
                        />
                    </div>

                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Tracks ({event.tracks.length})</h2>
                        <ul className="list-none space-y-2 mb-4">
                            {event.tracks.map(t => <TrackItem key={t.id} track={t} eventId={event.id} />)}
                        </ul>
                        <AddTrackForm eventId={event.id} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Custom Questions ({event.customQuestions.length})</h2>
                        {submissionsExist ? (
                            <p className="text-sm text-red-600 font-medium mb-2">Submissions exist. Structural edits are frozen.</p>
                        ) : (
                            <p className="text-sm text-green-600 font-medium mb-2">No submissions yet. You may add or remove questions.</p>
                        )}
                        <ul className="list-none space-y-2 mb-4">
                            {event.customQuestions.map(q => (
                                <QuestionItem key={q.id} question={q} eventId={event.id} disabled={submissionsExist} />
                            ))}
                        </ul>
                        <AddQuestionForm eventId={event.id} disabled={submissionsExist} />
                    </div>

                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Prizes ({event.prizes.length})</h2>
                        <ul className="list-none space-y-2 mb-4">
                            {event.prizes.map(p => (
                                <PrizeItem key={p.id} prize={{...p, amount: p.amount ? p.amount.toString() : null}} eventId={event.id} />
                            ))}
                        </ul>
                        <AddPrizeForm eventId={event.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
