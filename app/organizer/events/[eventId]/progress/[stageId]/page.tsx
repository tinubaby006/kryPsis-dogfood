"use client";

import { useState, useEffect } from "react";
import { getStageProgress, closeJudgingStage } from "../../judging-actions";
import { Activity, CheckCircle2, Circle, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function OrganizerProgressView() {
    const params = useParams();
    const eventId = params.eventId as string;
    const stageId = params.stageId as string;
    
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [closing, setClosing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const router = useRouter();

    const handleCloseStage = async () => {
        if (!confirm("Are you sure you want to close this judging stage? Judges will no longer be able to submit scores.")) return;
        setClosing(true);
        const res = await closeJudgingStage(eventId, stageId);
        if (res.error) {
            setError(res.error);
            setClosing(false);
        } else {
            alert("Judging stage closed successfully!");
            router.push(`/organizer/events/${eventId}`);
        }
    };

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

    if (loading) return <div className="p-8 text-center text-muted-foreground">Connecting to telemetry...</div>;
    if (error) return <div className="p-8 text-destructive font-bold bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>;

    const s = progress.summary;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <Link href={`/organizer/events/${eventId}`} className="text-link hover:underline font-medium text-sm mb-2 block focus:ring-2 focus:ring-ring focus:outline-none rounded">
                        &larr; Back to Organizer Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
                        <Activity className="w-8 h-8 text-primary" /> Stage Progress Telemetry
                    </h1>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Live 
                        </span>
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                    {progress.stageState === "OPEN" && (
                        <button 
                            onClick={handleCloseStage} 
                            disabled={closing}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4" />
                            {closing ? "Closing..." : "Close Judging Stage"}
                        </button>
                    )}
                    {["CLOSED", "CALCULATING", "FINALIZED", "PUBLISHED"].includes(progress.stageState) && (
                        <Link 
                            href={`/organizer/events/${eventId}/results/${stageId}`}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Activity className="w-4 h-4" /> View Results & Explainability
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-muted-foreground font-medium">Total Assigned</div>
                    <div className="text-2xl font-bold text-foreground">{s.totalAssigned}</div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-success/30 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-success font-medium">Completed (Submitted)</div>
                    <div className="text-2xl font-bold text-success">{s.totalSubmitted}</div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-warning/30 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-warning font-medium">In Progress (Draft)</div>
                    <div className="text-2xl font-bold text-warning">{s.totalDrafts}</div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-destructive/30 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-sm text-destructive font-medium">Cancelled</div>
                    <div className="text-2xl font-bold text-destructive">{s.totalCancelled}</div>
                </div>
            </div>

            {s.isHistorical && (
                <div className="mb-8 p-4 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm font-medium">
                    This stage contains imported historical records. Percentage bars are suppressed as the true original denominators are unknown.
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="p-4 bg-muted border-b border-border">
                        <h3 className="font-bold text-foreground">Judge Activity</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Judge ID</th>
                                    <th className="px-4 py-2 text-right font-medium">Done</th>
                                    <th className="px-4 py-2 text-right font-medium">Draft</th>
                                    <th className="px-4 py-2 text-right font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {progress.judges.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No judges active.</td></tr>
                                )}
                                {progress.judges.map((j: any) => (
                                    <tr key={j.id} className={`${j.unavailable ? 'opacity-50 bg-destructive/5' : 'hover:bg-muted/50 transition-colors'}`}>
                                        <td className="px-4 py-2 font-mono text-xs flex items-center gap-2">
                                            {j.unavailable && <AlertCircle className="w-3 h-3 text-destructive" />}
                                            {j.id}
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-success">{j.submitted}</td>
                                        <td className="px-4 py-2 text-right text-warning">{j.draft}</td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">{j.assigned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="p-4 bg-muted border-b border-border">
                        <h3 className="font-bold text-foreground">Project Coverage</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Project ID</th>
                                    <th className="px-4 py-2 text-right font-medium">Done</th>
                                    <th className="px-4 py-2 text-right font-medium">Total Assigned</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {progress.projects.length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No projects assigned.</td></tr>
                                )}
                                {progress.projects.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-2 font-mono text-xs">{p.id}</td>
                                        <td className="px-4 py-2 text-right font-bold text-success">{p.submitted}</td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">{p.assigned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
