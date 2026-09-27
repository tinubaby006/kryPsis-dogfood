import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AddTrackForm, AddQuestionForm } from "./OrganizerForms";

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
                        <p><strong>Visibility:</strong> {event.visibility}</p>
                        <p><strong>Closes:</strong> {event.submissionsCloseAt ? new Date(event.submissionsCloseAt).toLocaleString() : 'N/A'}</p>
                        <p><strong>Max Team Size:</strong> {event.maxTeamSize}</p>
                    </div>

                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Tracks ({event.tracks.length})</h2>
                        <ul className="list-disc pl-5">
                            {event.tracks.map(t => <li key={t.id}>{t.name}</li>)}
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
                        <ul className="list-disc pl-5">
                            {event.customQuestions.map(q => (
                                <li key={q.id}>{q.label} <span className="text-xs text-gray-400">({q.type}) {q.required ? '*Required' : ''}</span></li>
                            ))}
                        </ul>
                        <AddQuestionForm eventId={event.id} disabled={submissionsExist} />
                    </div>

                    <div className="bg-white p-6 rounded border shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Prizes ({event.prizes.length})</h2>
                        <ul className="list-disc pl-5">
                            {event.prizes.map(p => (
                                <li key={p.id}>{p.name} {p.amount ? `- ${p.amount} ${p.currency}` : ''}</li>
                            ))}
                        </ul>
                        <p className="text-sm text-gray-500 mt-2">API integration ready for edits.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
