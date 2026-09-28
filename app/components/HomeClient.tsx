"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { EventCard } from "./EventCard";
import { Search } from "lucide-react";
import { Prisma } from "@prisma/client";

type EventData = {
    id: string;
    name: string;
    description: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    submissionsOpenAt: Date | null;
    submissionsCloseAt: Date;
    timeZone: string;
    prizes: { amount: string | null, currency: string | null }[];
    _count: { tracks: number };
};

type HomeClientProps = {
    events: EventData[];
    session: any; // Using any for session to avoid complex type matching here, will refine if needed
};

export function HomeClient({ events, session }: HomeClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "OPEN" | "UPCOMING" | "CLOSED">("ALL");
    const now = new Date();

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            const isOpen = (!event.submissionsOpenAt || now >= event.submissionsOpenAt) && now < event.submissionsCloseAt;
            const isUpcoming = event.submissionsOpenAt && now < event.submissionsOpenAt;
            const isClosed = now >= event.submissionsCloseAt;

            if (activeTab === "OPEN") return isOpen;
            if (activeTab === "UPCOMING") return isUpcoming;
            if (activeTab === "CLOSED") return isClosed;
            return true;
        });
    }, [events, searchQuery, activeTab, now]);

    // Choose featured event: prefer open, else upcoming, else recent closed
    const featuredEvent = useMemo(() => {
        if (events.length === 0) return null;
        const open = events.filter(e => (!e.submissionsOpenAt || now >= e.submissionsOpenAt) && now < e.submissionsCloseAt);
        if (open.length > 0) return open[0];
        
        const upcoming = events.filter(e => e.submissionsOpenAt && now < e.submissionsOpenAt);
        if (upcoming.length > 0) return upcoming[0]; // Nearest upcoming since sorted ascending

        const closed = events.filter(e => now >= e.submissionsCloseAt);
        if (closed.length > 0) return closed[closed.length - 1]; // Most recent closed
        
        return events[0];
    }, [events, now]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            {/* Header / Featured Section */}
            <div className="flex flex-col md:flex-row gap-8 mb-12">
                <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover the best hackathons</h1>
                    <p className="text-xl text-gray-600 mb-8">Join the community, build amazing projects, and win prizes.</p>
                    
                    {/* Action Panel */}
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Your Workspace</h2>
                        {!session?.user ? (
                            <div className="flex gap-4">
                                <Link href="/sign-in" className="bg-gray-100 px-4 py-2 rounded-lg font-medium hover:bg-gray-200">Sign in</Link>
                                <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Host an event</Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4">
                                <Link href="/dashboard" className="bg-gray-100 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 text-sm border">My Workspace</Link>
                                {session.user.canCreateEvents && (
                                    <>
                                        <Link href="/organizer" className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 text-sm border border-blue-200">Manage my events</Link>
                                        <Link href="/organizer/events/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 text-sm">Create Event</Link>
                                    </>
                                )}
                                {session.user.isPlatformAdmin && (
                                    <Link href="/admin" className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-100 text-sm border border-purple-200">Admin Dashboard</Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Featured Event Card */}
                {featuredEvent && (
                    <div className="flex-1 relative rounded-2xl overflow-hidden border bg-gray-900 text-white p-8 flex flex-col justify-end min-h-[300px]">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent z-10" />
                        <div className="relative z-20">
                            <span className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wide mb-3">Featured Event</span>
                            <h2 className="text-3xl font-bold mb-2">{featuredEvent.name}</h2>
                            <p className="text-gray-300 line-clamp-2 mb-4">{featuredEvent.description}</p>
                            <Link href={`/events/${featuredEvent.id}`} className="inline-block bg-white text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                                View Event Details
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                    {(["ALL", "OPEN", "UPCOMING", "CLOSED"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab === "ALL" ? "All Events" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search events..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Event Grid */}
            {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No events found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your filters or search query.</p>
                    {(searchQuery || activeTab !== "ALL") && (
                        <button onClick={() => { setSearchQuery(""); setActiveTab("ALL"); }} className="text-blue-600 hover:underline text-sm font-medium">
                            Clear all filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
