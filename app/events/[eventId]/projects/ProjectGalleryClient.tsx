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
            <div className="bg-white p-4 rounded border shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder="Search projects..." 
                    className="border p-2 rounded flex-1"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                />
                <select 
                    className="border p-2 rounded"
                    value={trackId}
                    onChange={e => setTrackId(e.target.value)}
                >
                    <option value="">All Tracks</option>
                    {tracks.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input 
                    type="text" 
                    placeholder="Filter by tech tag..." 
                    className="border p-2 rounded"
                    value={tag}
                    onChange={e => setTag(e.target.value)}
                />
            </div>

            {/* Gallery Grid */}
            {projects.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border rounded-lg">
                    <p className="text-gray-500">No projects match your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((p: any) => (
                        <div key={p.id} className="border rounded-lg overflow-hidden shadow-sm flex flex-col bg-white">
                            <Link href={`/events/${eventId}/projects/${p.id}`} className="block relative">
                                {p.assets?.find((a: any) => a.kind === "THUMBNAIL") ? (
                                    <img 
                                        src={`/api/assets/${p.assets.find((a: any) => a.kind === "THUMBNAIL").storageKey}`} 
                                        alt={p.title} 
                                        className="w-full h-48 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                                        No Thumbnail
                                    </div>
                                )}
                                {isOrganizer && p.duplicateOfId && (
                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold shadow">
                                        Duplicate
                                    </div>
                                )}
                            </Link>
                            
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold mb-1">
                                    <Link href={`/events/${eventId}/projects/${p.id}`} className="hover:text-blue-600">
                                        {p.title}
                                    </Link>
                                </h3>
                                <p className="text-sm text-gray-500 mb-2">by {p.team.name}</p>
                                
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {p.track && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{p.track.name}</span>}
                                    {p.techTags?.slice(0, 3).map((t: string) => (
                                        <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{t}</span>
                                    ))}
                                </div>
                                
                                <p className="text-gray-700 text-sm mb-4 flex-1 line-clamp-3">{p.summary}</p>
                                
                                {isOrganizer && p.duplicateOfId && (
                                    <div className="mt-2 text-xs bg-red-50 text-red-800 p-2 rounded border border-red-200">
                                        <strong>Diagnostic:</strong> Marked as duplicate of {p.duplicateOfId}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                    <button 
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
