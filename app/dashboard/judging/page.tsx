"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, Info, Search } from "lucide-react";

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
        <div className="py-8">
            <h1 className="text-3xl font-bold mb-8 font-heading flex items-center gap-2 text-foreground">
                <Gavel className="w-8 h-8 text-primary" /> Judge Workspace
            </h1>
            
            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 rounded-md mb-6 font-medium text-sm">{error}</div>}

            <div className="bg-card border border-border p-6 rounded-xl mb-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <h2 className="text-xl font-bold mb-3 font-heading text-foreground">Welcome, Judge!</h2>
                <p className="mb-4 text-muted-foreground">Thank you for participating in the events. Your expertise is crucial to evaluating projects fairly and efficiently.</p>
                <div className="bg-muted/50 p-4 rounded-md text-sm text-foreground/80 flex gap-3 border border-border/50 items-start">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p><strong>Note:</strong> The new T2 scoring and rubrics system is now live! Click on an event below to enter your secure judging workbench, where you can evaluate projects and submit scores.</p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-6 font-heading text-foreground border-b border-border pb-2">Your Assigned Events</h2>
            
            {loading ? (
                <div className="text-muted-foreground py-12 flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 mb-4 opacity-20" />
                    <p>Loading events...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center border border-dashed border-border rounded-xl bg-card">
                    <Gavel className="w-10 h-10 mx-auto mb-4 opacity-20" />
                    <p className="max-w-md mx-auto">
                        You do not have active judge access to any published events yet. 
                        If you recently accepted an invitation, it might still be awaiting organizer confirmation.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map(event => (
                        <div key={event.id} className="border border-border rounded-xl bg-card p-6 shadow-sm hover:border-primary/50 transition-colors group flex flex-col h-full">
                            <h3 className="text-xl font-bold mb-3 font-heading">
                                <Link href={`/events/${event.slug}`} className="text-foreground group-hover:text-primary transition-colors">
                                    {event.name}
                                </Link>
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2 mb-6 flex-1 bg-muted/30 p-4 rounded-md border border-border">
                                <p><strong className="text-foreground/80 font-semibold">Starts:</strong> <span className="float-right">{event.startsAt ? new Date(event.startsAt).toLocaleDateString() : 'TBA'}</span></p>
                                <p><strong className="text-foreground/80 font-semibold">Closes:</strong> <span className="float-right">{new Date(event.submissionsCloseAt).toLocaleDateString()}</span></p>
                                <p><strong className="text-foreground/80 font-semibold">Time Zone:</strong> <span className="float-right">{event.timeZone}</span></p>
                            </div>
                            <div className="mt-auto">
                                <Link 
                                    href={`/events/${event.slug}/judge`} 
                                    className="block text-center bg-primary border border-primary text-primary-foreground font-medium px-4 py-2.5 rounded-md hover:bg-primary-hover transition-colors text-sm"
                                >
                                    Enter Judging Workbench
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
