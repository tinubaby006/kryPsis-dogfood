"use client";

import { useState, useEffect } from "react";
import { getStageProgress } from "../../judging-actions";
import { Activity, CheckCircle2, Circle, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OrganizerProgressView({ params }: { params: { eventId: string, stageId: string } }) {
    const { eventId, stageId } = params;
    
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const loadData = async () => {
        const res = await getStageProgress(eventId, stageId);
        if (res.error) setError(res.error);
        else {
            setProgress(res);
            setLastUpdate(new Date());
        }
        setLoading(false);
    };

    // Poll every 10 seconds without websockets
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [eventId, stageId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Connecting to telemetry...</div>;
    if (error) return <div className="p-8 text-red-600 font-bold bg-red-50 border-red-200">{error}</div>;

    const s = progress.summary;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <Link href={`/organizer/events/${eventId}`} className="text-blue-600 hover:underline font-medium text-sm mb-2 block">
                        &larr; Back to Organizer Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Activity className="w-8 h-8" /> Stage Progress Telemetry
                    </h1>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Live 
                    </span>
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-sm text-gray-500 font-medium">Total Assigned</div>
                    <div className="text-2xl font-bold text-gray-900">{s.totalAssigned}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                    <div className="text-sm text-green-700 font-medium">Completed (Submitted)</div>
                    <div className="text-2xl font-bold text-green-900">{s.totalSubmitted}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                    <div className="text-sm text-amber-700 font-medium">In Progress (Draft)</div>
                    <div className="text-2xl font-bold text-amber-900">{s.totalDrafts}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                    <div className="text-sm text-red-700 font-medium">Cancelled</div>
                    <div className="text-2xl font-bold text-red-900">{s.totalCancelled}</div>
                </div>
            </div>

            {s.isHistorical && (
                <div className="mb-8 p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-sm font-medium">
                    This stage contains imported historical records. Percentage bars are suppressed as the true original denominators are unknown.
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-bold text-gray-900">Judge Activity</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="px-4 py-2">Judge ID</th>
                                <th className="px-4 py-2 text-right">Done</th>
                                <th className="px-4 py-2 text-right">Draft</th>
                                <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {progress.judges.map((j: any) => (
                                <tr key={j.id} className={j.unavailable ? 'opacity-50' : ''}>
                                    <td className="px-4 py-2 font-mono text-xs flex items-center gap-2">
                                        {j.unavailable && <AlertCircle className="w-3 h-3 text-red-500" />}
                                        {j.id}
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-green-700">{j.submitted}</td>
                                    <td className="px-4 py-2 text-right text-amber-600">{j.draft}</td>
                                    <td className="px-4 py-2 text-right text-gray-600">{j.assigned}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-bold text-gray-900">Project Coverage</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="px-4 py-2">Project ID</th>
                                <th className="px-4 py-2 text-right">Done</th>
                                <th className="px-4 py-2 text-right">Total Assigned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {progress.projects.map((p: any) => (
                                <tr key={p.id}>
                                    <td className="px-4 py-2 font-mono text-xs">{p.id}</td>
                                    <td className="px-4 py-2 text-right font-bold text-green-700">{p.submitted}</td>
                                    <td className="px-4 py-2 text-right text-gray-600">{p.assigned}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
