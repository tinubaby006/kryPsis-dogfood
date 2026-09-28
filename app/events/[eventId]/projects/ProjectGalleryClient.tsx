"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProjectGalleryClient({ 
    projects, 
    tracks, 
    isOrganizer,
    currentPage,
    totalPages,
    eventId
}: any) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [q, setQ] = useState(searchParams.get("q") || "");
    const [trackId, setTrackId] = useState(searchParams.get("trackId") || "");
    const [tag, setTag] = useState(searchParams.get("tag") || "");

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (trackId) params.set("trackId", trackId);
            if (tag) params.set("tag", tag);
            params.set("page", "1"); // reset to page 1 on filter change
            router.push(`/events/${eventId}/projects?${params.toString()}`);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [q, trackId, tag, router, eventId]);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`/events/${eventId}/projects?${params.toString()}`);
    };

    return (
        <div>
            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder="Search projects..." 
                    className="border border-border bg-background text-foreground p-2 rounded-md flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                />
                <select 
                    className="border border-border bg-background text-foreground p-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={trackId}
                    onChange={e => setTrackId(e.target.value)}
                >
                    <option value="">All Tracks</option>
                    {tracks.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input 
                    type="text" 
                    placeholder="Filter by tech tag..." 
                    className="border border-border bg-background text-foreground p-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    value={tag}
                    onChange={e => setTag(e.target.value)}
                />
            </div>

            {/* Gallery Grid */}
            {projects.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 border border-border rounded-xl">
                    <p className="text-muted-foreground">No projects match your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((p: any) => {
                        const firstLetter = p.title ? p.title.charAt(0).toUpperCase() : "?";
                        return (
                            <div key={p.id} className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col bg-card hover:border-primary/50 transition-colors group">
                                <Link href={`/events/${eventId}/projects/${p.id}`} className="block relative aspect-[3/2] overflow-hidden">
                                    {p.assets?.find((a: any) => a.kind === "THUMBNAIL") ? (
                                        <img 
                                            src={`/api/assets/${p.assets.find((a: any) => a.kind === "THUMBNAIL").storageKey}`} 
                                            alt={p.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-inner">
                                                <span className="text-2xl font-bold font-heading text-muted-foreground">{firstLetter}</span>
                                            </div>
                                        </div>
                                    )}
                                    {isOrganizer && p.duplicateOfId && (
                                        <div className="absolute top-2 right-2 bg-destructive text-destructive-text text-xs px-2 py-1 rounded font-bold shadow">
                                            Duplicate
                                        </div>
                                    )}
                                </Link>
                                
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold mb-1 font-heading">
                                        <Link href={`/events/${eventId}/projects/${p.id}`} className="text-foreground group-hover:text-primary transition-colors">
                                            {p.title}
                                        </Link>
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">by {p.team.name}</p>
                                    
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {p.track && <span className="bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded">{p.track.name}</span>}
                                        {p.techTags?.slice(0, 3).map((t: string) => (
                                            <span key={t} className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded border border-border">{t}</span>
                                        ))}
                                    </div>
                                    
                                    <p className="text-foreground/80 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{p.summary}</p>
                                    
                                    {isOrganizer && p.duplicateOfId && (
                                        <div className="mt-2 text-xs bg-destructive/10 text-destructive-text p-2 rounded-md border border-destructive/20">
                                            <strong>Diagnostic:</strong> Marked as duplicate of {p.duplicateOfId}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-3 mt-10">
                    <button 
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 bg-card border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 bg-card border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
