"use client";

import { useState, useEffect } from "react";
import { getCalculationPreviewAction, commitCalculationAction, publishStageAction } from "../../judging-actions";
import { Calculator, CheckCircle, AlertTriangle, ShieldCheck, Download, Table, GitCommit, Save, Globe } from "lucide-react";
import Link from "next/link";

export default function OrganizerExplainabilityView({ params }: { params: { eventId: string, stageId: string } }) {
    const { eventId, stageId } = params;
    
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [committing, setCommitting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError("");
        const res = await getCalculationPreviewAction(eventId, stageId);
        if (res.error) setError(res.error);
        else {
            setPreview(res.preview);
            if ((res as any).stageState === "FINALIZED") {
                // We'll check the published state from the fetch below
            }
        }
        setLoading(false);
    };

    const handleCommit = async () => {
        if (!preview) return;
        setCommitting(true);
        const res = await commitCalculationAction(eventId, stageId, preview.inputHash, preview.configHash);
        if (res.error) setError(res.error);
        else {
            alert("Calculation committed successfully!");
            loadData(); // reload
        }
        setCommitting(false);
    };

    const handlePublish = async () => {
        if (!confirm("Are you sure? This will make the results visible to the public.")) return;
        setPublishing(true);
        const res = await publishStageAction(eventId, stageId);
        if (res.error) setError(res.error);
        else {
            alert("Results published successfully!");
            setPublished(true);
        }
        setPublishing(false);
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading calculation models...</div>;
    if (error) return <div className="p-8 text-destructive font-bold bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>;

    const isConnected = preview?.diagnostics?.connected;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <Link href={`/organizer/events/${eventId}`} className="text-link hover:underline font-medium text-sm mb-2 block focus:ring-2 focus:ring-ring focus:outline-none rounded">
                        &larr; Back to Organizer Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
                        <Calculator className="w-8 h-8 text-primary" /> Algorithm Explainability
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="px-4 py-2 border border-border rounded font-medium text-sm bg-card hover:bg-muted focus:ring-2 focus:ring-ring focus:outline-none transition-colors">
                        Recalculate
                    </button>
                    {isConnected && preview.stageState !== "FINALIZED" && preview.stageState !== "PUBLISHED" && (
                        <button disabled={committing} onClick={handleCommit} className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium text-sm hover:bg-primary-hover focus:ring-2 focus:ring-ring focus:outline-none transition-colors flex items-center gap-2 disabled:opacity-50">
                            <Save className="w-4 h-4" /> {committing ? "Committing..." : "Commit Results"}
                        </button>
                    )}
                    {(preview.stageState === "FINALIZED" || preview.stageState === "PUBLISHED") && (
                        <button 
                            disabled={publishing || published} 
                            onClick={handlePublish} 
                            className={`px-4 py-2 rounded font-medium text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 ${published ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary-hover'}`}
                        >
                            {published ? <CheckCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            {published ? "Published" : publishing ? "Publishing..." : "Publish Results"}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-foreground mb-2">Algorithm Status</h3>
                    {isConnected ? (
                        <div className="text-success font-bold flex items-center gap-2 bg-success/10 p-3 rounded border border-success/20">
                            <CheckCircle className="w-5 h-5" /> CALIBRATED (WLS)
                        </div>
                    ) : (
                        <div className="text-warning font-bold flex items-center gap-2 bg-warning/10 p-3 rounded border border-warning/20">
                            <AlertTriangle className="w-5 h-5" /> DISCONNECTED FALLBACK
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                        {isConnected 
                            ? "Judge overlap graph is fully connected. Bias offsets were successfully calculated and applied."
                            : "Graph is disconnected. Zero-bias assumed. Cannot calibrate independent components safely."}
                    </p>
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm col-span-2 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> Diagnostics</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div><strong>Total Reviews:</strong> <span className="text-muted-foreground">{preview.diagnostics.totalReviews}</span></div>
                        <div><strong>Active Judges:</strong> <span className="text-muted-foreground">{preview.diagnostics.judgesCount}</span></div>
                        <div><strong>Projects Scored:</strong> <span className="text-muted-foreground">{preview.diagnostics.projectsCount}</span></div>
                        <div><strong>Config Hash:</strong> <span className="font-mono text-xs bg-muted text-muted-foreground p-1 rounded select-all">{preview.configHash.slice(0,8)}</span></div>
                        <div><strong>Input Hash:</strong> <span className="font-mono text-xs bg-muted text-muted-foreground p-1 rounded select-all">{preview.inputHash.slice(0,8)}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-8">
                <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2"><Table className="w-5 h-5" /> Project Results</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 font-medium">Rank</th>
                                <th className="px-4 py-3 font-medium">Project ID</th>
                                <th className="px-4 py-3 text-right font-medium">Reviews (m)</th>
                                <th className="px-4 py-3 text-right font-medium">Raw Mean</th>
                                <th className="px-4 py-3 text-right font-medium bg-primary/5">Normalized Mean</th>
                                <th className="px-4 py-3 text-right font-medium">SD (Disagreement)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {preview.results.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No calculation results available.</td></tr>
                            )}
                            {preview.results.map((r: any) => (
                                <tr key={r.projectId} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-2 font-bold text-foreground">{r.rank}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.projectId}</td>
                                    <td className="px-4 py-2 text-right">{r.reviewCount}</td>
                                    <td className="px-4 py-2 text-right text-muted-foreground">{r.rawMean.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-primary bg-primary/5">{r.normalizedMean.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-muted-foreground">{r.sd ? r.sd.toFixed(2) : "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mb-8">
                <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2"><GitCommit className="w-5 h-5" /> Judge Calibrations (Offsets)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 font-medium">Judge ID</th>
                                <th className="px-4 py-3 text-right font-medium">Reviews Given</th>
                                <th className="px-4 py-3 text-right font-medium">Calculated Offset (Bias)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {preview.calibrations.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No judge calibration data available.</td></tr>
                            )}
                            {preview.calibrations.map((c: any) => (
                                <tr key={c.judgeUserId} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.judgeUserId}</td>
                                    <td className="px-4 py-2 text-right">{c.reviewCount}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${c.offset > 0 ? 'text-success' : c.offset < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {c.offset > 0 ? '+' : ''}{c.offset.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-muted text-xs text-muted-foreground border-t border-border">
                    <strong>Limitations:</strong> The WLS algorithm assumes bias is constant across all projects for a judge. It does not account for specific track-expertise deviations. Normalization clamps extreme outliers back to [0, 100].
                </div>
            </div>
        </div>
    );
}
