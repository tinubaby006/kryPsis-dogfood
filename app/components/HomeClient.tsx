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
    session: any;
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

    const featuredEvent = useMemo(() => {
        if (events.length === 0) return null;
        const open = events.filter(e => (!e.submissionsOpenAt || now >= e.submissionsOpenAt) && now < e.submissionsCloseAt);
        if (open.length > 0) return open[0];
        
        const upcoming = events.filter(e => e.submissionsOpenAt && now < e.submissionsOpenAt);
        if (upcoming.length > 0) return upcoming[0];

        const closed = events.filter(e => now >= e.submissionsCloseAt);
        if (closed.length > 0) return closed[closed.length - 1];
        
        return events[0];
    }, [events, now]);

    return (
        <div className="w-full">
            {/* Hero Section with Grid Texture */}
            <div className="relative w-full border-b border-border bg-background overflow-hidden py-16 md:py-24">
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
                />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-heading text-foreground">
                            Build the future.<br/> <span className="text-primary">Together.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                            Join elite builders and creators on the premier platform for hackathons and innovation challenges.
                        </p>
                        
                        {!session?.user ? (
                            <div className="flex gap-4">
                                <Link href="/sign-up" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm">
                                    Host an event
                                </Link>
                                <Link href="/sign-in" className="bg-card border border-border text-foreground px-6 py-3 rounded-md font-medium hover:bg-muted transition-colors">
                                    Sign in
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4">
                                <Link href="/dashboard" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm">
                                    Go to Workspace
                                </Link>
                                <Link href="/organizer/events/new" className="bg-card border border-border text-foreground px-6 py-3 rounded-md font-medium hover:bg-muted transition-colors">
                                    Propose an Event
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    {/* Featured Event Card */}
                    {featuredEvent && (
                        <div className="flex-1 w-full relative rounded-xl overflow-hidden border border-border bg-card text-card-foreground p-8 flex flex-col justify-end min-h-[340px] shadow-lg group">
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent z-10" />
                            <div className="relative z-20">
                                <span className="inline-block bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-4 border border-primary/30">
                                    Featured Event
                                </span>
                                <h2 className="text-3xl font-bold mb-3 font-heading group-hover:text-primary transition-colors">{featuredEvent.name}</h2>
                                <p className="text-muted-foreground line-clamp-2 mb-6 text-sm">{featuredEvent.description}</p>
                                <Link href={`/events/${featuredEvent.id}`} className="inline-block bg-foreground text-background font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity text-sm">
                                    View Details
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Events List Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex bg-muted/50 p-1 rounded-md w-full md:w-auto border border-border">
                        {(["ALL", "OPEN", "UPCOMING", "CLOSED"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 md:flex-none px-5 py-2 text-sm font-medium rounded transition-colors ${
                                    activeTab === tab 
                                    ? "bg-card shadow-sm text-foreground border border-border" 
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab === "ALL" ? "All Events" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder="Search events..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-card rounded-xl border border-border border-dashed">
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-heading">No events found</h3>
                        <p className="text-muted-foreground mb-6">Try adjusting your filters or search query.</p>
                        {(searchQuery || activeTab !== "ALL") && (
                            <button 
                                onClick={() => { setSearchQuery(""); setActiveTab("ALL"); }} 
                                className="text-primary hover:text-primary-hover text-sm font-medium"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
