"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EventItem {
    id: string;
    name: string;
    slug: string;
    startsAt: string | null;
    endsAt: string | null;
    submissionsCloseAt: string;
    timeZone: string;
}

export default function JudgingDashboard() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/me/judging-events");
                if (!res.ok) throw new Error("Failed to load events");
                const data = await res.json();
                setEvents(data.events);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Judge Workspace</h1>
            
            {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>}

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-xl mb-8">
                <h2 className="text-xl font-bold mb-2">Welcome, Judge!</h2>
                <p className="mb-2">Thank you for participating in the events. Your expertise is crucial to evaluating projects fairly and efficiently.</p>
                <div className="bg-white/80 p-4 rounded-lg mt-4 text-sm text-gray-700 border border-blue-100">
                    <p><strong>Note:</strong> The actual scoring and rubrics systems are scheduled for a future T2 release. For now, you can view the events you have been assigned to judge.</p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">Your Assigned Events</h2>
            
            {loading ? (
                <div className="text-gray-500 py-8">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-gray-500 py-8 text-center border-2 border-dashed rounded-xl">
                    You do not have active judge access to any published events yet. 
                    If you recently accepted an invitation, it might still be awaiting organizer confirmation.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {events.map(event => (
                        <div key={event.id} className="border rounded-xl p-6 shadow-sm hover:shadow-md transition">
                            <h3 className="text-xl font-bold mb-2">
                                <Link href={`/events/${event.slug}`} className="text-blue-600 hover:underline">
                                    {event.name}
                                </Link>
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1 mb-4">
                                <p><strong>Starts:</strong> {event.startsAt ? new Date(event.startsAt).toLocaleString() : 'TBA'}</p>
                                <p><strong>Submissions Close:</strong> {new Date(event.submissionsCloseAt).toLocaleString()}</p>
                                <p><strong>Time Zone:</strong> {event.timeZone}</p>
                            </div>
                            <Link 
                                href={`/events/${event.slug}`} 
                                className="inline-block bg-gray-100 text-gray-800 font-medium px-4 py-2 rounded hover:bg-gray-200"
                            >
                                View Event Hub
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
