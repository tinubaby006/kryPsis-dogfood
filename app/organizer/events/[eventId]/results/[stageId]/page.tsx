"use client";

import { useState, useEffect } from "react";
import { getCalculationPreviewAction, commitCalculationAction, finalizeCalculation } from "../../judging-actions";
import { Calculator, CheckCircle, AlertTriangle, ShieldCheck, Download, Table, GitCommit, Save } from "lucide-react";
import Link from "next/link";

export default function OrganizerExplainabilityView({ params }: { params: { eventId: string, stageId: string } }) {
    const { eventId, stageId } = params;
    
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [committing, setCommitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError("");
        const res = await getCalculationPreviewAction(eventId, stageId);
        if (res.error) setError(res.error);
        else setPreview(res.preview);
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

    if (loading) return <div className="p-8 text-center">Loading calculation models...</div>;
    if (error) return <div className="p-8 text-red-600 bg-red-50">{error}</div>;

    const isConnected = preview?.diagnostics?.connected;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <Link href={`/organizer/events/${eventId}`} className="text-blue-600 hover:underline font-medium text-sm mb-2 block">
                        &larr; Back to Organizer Dashboard
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Calculator className="w-8 h-8" /> Algorithm Explainability
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="px-4 py-2 border rounded font-medium text-sm bg-white hover:bg-gray-50">
                        Recalculate
                    </button>
                    {isConnected && (
                        <button disabled={committing} onClick={handleCommit} className="px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> Commit Results
                        </button>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2">Algorithm Status</h3>
                    {isConnected ? (
                        <div className="text-green-700 font-bold flex items-center gap-2 bg-green-50 p-3 rounded border border-green-200">
                            <CheckCircle className="w-5 h-5" /> CALIBRATED (WLS)
                        </div>
                    ) : (
                        <div className="text-amber-700 font-bold flex items-center gap-2 bg-amber-50 p-3 rounded border border-amber-200">
                            <AlertTriangle className="w-5 h-5" /> DISCONNECTED FALLBACK
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                        {isConnected 
                            ? "Judge overlap graph is fully connected. Bias offsets were successfully calculated and applied."
                            : "Graph is disconnected. Zero-bias assumed. Cannot calibrate independent components safely."}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm col-span-2">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-blue-600" /> Diagnostics</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div><strong>Total Reviews:</strong> {preview.diagnostics.totalReviews}</div>
                        <div><strong>Active Judges:</strong> {preview.diagnostics.judgesCount}</div>
                        <div><strong>Projects Scored:</strong> {preview.diagnostics.projectsCount}</div>
                        <div><strong>Config Hash:</strong> <span className="font-mono text-xs bg-gray-100 p-1 rounded">{preview.configHash.slice(0,8)}</span></div>
                        <div><strong>Input Hash:</strong> <span className="font-mono text-xs bg-gray-100 p-1 rounded">{preview.inputHash.slice(0,8)}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Table className="w-5 h-5" /> Project Results</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Rank</th>
                                <th className="px-4 py-3">Project ID</th>
                                <th className="px-4 py-3 text-right">Reviews (m)</th>
                                <th className="px-4 py-3 text-right">Raw Mean</th>
                                <th className="px-4 py-3 text-right bg-blue-50">Normalized Mean</th>
                                <th className="px-4 py-3 text-right">SD (Disagreement)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {preview.results.map((r: any) => (
                                <tr key={r.projectId} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-bold text-gray-900">{r.rank}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{r.projectId}</td>
                                    <td className="px-4 py-2 text-right">{r.reviewCount}</td>
                                    <td className="px-4 py-2 text-right text-gray-500">{r.rawMean.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-blue-700 bg-blue-50/30">{r.normalizedMean.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-gray-500">{r.sd ? r.sd.toFixed(2) : "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><GitCommit className="w-5 h-5" /> Judge Calibrations (Offsets)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Judge ID</th>
                                <th className="px-4 py-3 text-right">Reviews Given</th>
                                <th className="px-4 py-3 text-right">Calculated Offset (Bias)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {preview.calibrations.map((c: any) => (
                                <tr key={c.judgeUserId} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{c.judgeUserId}</td>
                                    <td className="px-4 py-2 text-right">{c.reviewCount}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${c.offset > 0 ? 'text-green-600' : c.offset < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                        {c.offset > 0 ? '+' : ''}{c.offset.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-gray-50 text-xs text-gray-500 border-t">
                    <strong>Limitations:</strong> The WLS algorithm assumes bias is constant across all projects for a judge. It does not account for specific track-expertise deviations. Normalization clamps extreme outliers back to [0, 100].
                </div>
            </div>
        </div>
    );
}
