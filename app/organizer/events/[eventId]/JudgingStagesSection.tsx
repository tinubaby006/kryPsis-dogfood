"use client";

import { useState, useEffect } from "react";
import { createOrUpdateJudgingStage, saveRubricConfig, startAssignments, getAssignmentPreviewAction, commitAssignmentAction, closeJudgingStage } from "./judging-actions";
import { Gavel, Plus, Save, PlayCircle, Settings2, ShieldCheck, AlertCircle, CheckCircle, Activity, Calculator, Download, XCircle, Trophy } from "lucide-react";
import Link from "next/link";

export function JudgingStagesSection({ eventId, stages, tracks }: { eventId: string, stages: any[], tracks: any[] }) {
    const [isAdding, setIsAdding] = useState(false);
    
    return (
        <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm mt-8">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold font-heading">Judging Stages</h2>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary-hover font-medium transition-colors shadow-sm flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> New Stage
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
                    <h3 className="font-bold text-sm mb-3">Create Judging Stage</h3>
                    <StageForm eventId={eventId} tracks={tracks} onComplete={() => setIsAdding(false)} />
                </div>
            )}

            {stages.length === 0 && !isAdding ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-muted/10">
                    <Gavel className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No Judging Stages</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">Create your first judging stage to configure rubrics, assign judges, and begin scoring projects.</p>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary-hover font-medium transition-colors shadow-sm flex items-center gap-2 focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                        <Plus className="w-4 h-4" /> Create Stage
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {stages.map(stage => (
                        <StageCard key={stage.id} eventId={eventId} stage={stage} tracks={tracks} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StageForm({ eventId, stage, tracks, onComplete }: { eventId: string, stage?: any, tracks: any[], onComplete: () => void }) {
    const [name, setName] = useState(stage?.name || "");
    const [scope, setScope] = useState(stage?.scope || "EVENT");
    const [trackId, setTrackId] = useState(stage?.trackId || "");
    const [reqReviews, setReqReviews] = useState(stage?.requiredReviews || 1);
    const [startsAt, setStartsAt] = useState(stage?.startsAt ? new Date(stage.startsAt).toISOString().slice(0,16) : "");
    const [endsAt, setEndsAt] = useState(stage?.endsAt ? new Date(stage.endsAt).toISOString().slice(0,16) : "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        const res = await createOrUpdateJudgingStage(eventId, {
            id: stage?.id,
            name, scope, 
            trackId: scope === "TRACK" ? trackId : null,
            requiredReviews: reqReviews,
            startsAt: startsAt || null,
            endsAt: endsAt || null
        });
        setSaving(false);
        if (res.error) setError(res.error);
        else onComplete();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-xs text-destructive-text bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium mb-1">Stage Name</label>
                    <input required value={name} onChange={e=>setName(e.target.value)} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary" placeholder="e.g. Round 1" />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1">Required Reviews (R)</label>
                    <input type="number" min="1" required value={reqReviews} onChange={e=>setReqReviews(parseInt(e.target.value))} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium mb-1">Scope</label>
                    <select value={scope} onChange={e=>setScope(e.target.value)} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary">
                        <option value="EVENT">Entire Event</option>
                        <option value="TRACK">Specific Track</option>
                    </select>
                </div>
                {scope === "TRACK" && (
                    <div>
                        <label className="block text-xs font-medium mb-1">Track</label>
                        <select required value={trackId} onChange={e=>setTrackId(e.target.value)} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary">
                            <option value="">Select a track...</option>
                            {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium mb-1">Judging Starts At (Optional)</label>
                    <input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1">Judging Ends At (Optional)</label>
                    <input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="w-full p-2 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary" />
                </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={onComplete} className="px-3 py-1.5 text-xs font-medium hover:bg-muted rounded border border-transparent">Cancel</button>
                <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary-hover flex items-center gap-1 shadow-sm">
                    <Save className="w-3 h-3" /> Save Stage
                </button>
            </div>
        </form>
    );
}

function StageCard({ eventId, stage, tracks }: { eventId: string, stage: any, tracks: any[] }) {
    const [isEditing, setIsEditing] = useState(false);
    const canEdit = ["DRAFT", "CONFIGURED"].includes(stage.state);
    
    return (
        <div className="border border-border bg-background rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-muted/10 border-b border-border flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                        {stage.name}
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                            stage.state === 'OPEN' ? 'bg-success/10 text-success border-success/20' :
                            stage.state === 'DRAFT' ? 'bg-muted text-muted-foreground border-border' :
                            stage.state === 'CONFIGURED' ? 'bg-primary/10 text-primary border-primary/20' :
                            'bg-warning/10 text-warning border-warning/20'
                        }`}>
                            {stage.state}
                        </span>
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                        <span>Scope: <strong>{stage.scope === "TRACK" ? tracks.find(t=>t.id===stage.trackId)?.name : "Overall Event"}</strong></span>
                        <span>Required Reviews: <strong>{stage.requiredReviews}</strong></span>
                    </div>
                </div>
                {canEdit && (
                    <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-muted-foreground hover:text-foreground">
                        <Settings2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-4">
                {stage.state === 'ASSIGNING' ? (
                    <AssignmentPreview eventId={eventId} stage={stage} />
                ) : isEditing ? (
                    <StageForm eventId={eventId} stage={stage} tracks={tracks} onComplete={() => setIsEditing(false)} />
                ) : (
                    <RubricManager eventId={eventId} stage={stage} />
                )}

                {/* Workflow Links for active/past stages */}
                {!["DRAFT", "CONFIGURED", "ASSIGNING"].includes(stage.state) && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                        <Link 
                            href={`/organizer/events/${eventId}/progress/${stage.id}`}
                            className="text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-md hover:bg-border transition-colors border border-border flex items-center gap-1 shadow-sm"
                        >
                            <Activity className="w-3 h-3" /> Progress Telemetry
                        </Link>
                        {stage.state === "OPEN" && (
                            <button
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to close this judging stage?")) return;
                                    await closeJudgingStage(eventId, stage.id);
                                }}
                                className="text-xs font-medium bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <XCircle className="w-3 h-3" /> Close Stage
                            </button>
                        )}
                        {["CLOSED", "CALCULATING", "FINALIZED", "PUBLISHED"].includes(stage.state) && (
                            <Link 
                                href={`/organizer/events/${eventId}/results/${stage.id}`}
                                className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary-hover transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Calculator className="w-3 h-3" /> Explainability & Results
                            </Link>
                        )}
                        {["FINALIZED", "PUBLISHED"].includes(stage.state) && (
                            <Link 
                                href={`/events/${eventId}/results/${stage.id}`}
                                target="_blank"
                                className="text-xs font-bold bg-warning text-warning-foreground px-3 py-1.5 rounded-md hover:bg-warning/90 transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Trophy className="w-3 h-3" /> Public Leaderboard
                            </Link>
                        )}
                        <a 
                            href={`/organizer/events/${eventId}/exports?stageId=${stage.id}&type=results`}
                            className="text-xs font-medium text-link hover:underline px-3 py-1.5 flex items-center gap-1"
                            download
                        >
                            <Download className="w-3 h-3" /> Export Results
                        </a>
                        <a 
                            href={`/organizer/events/${eventId}/exports?stageId=${stage.id}&type=raw_reviews`}
                            className="text-xs font-medium text-link hover:underline px-3 py-1.5 flex items-center gap-1"
                            download
                        >
                            <Download className="w-3 h-3" /> Export Raw Scores
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function AssignmentPreview({ eventId, stage }: { eventId: string, stage: any }) {
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [committing, setCommitting] = useState(false);

    useEffect(() => {
        loadPreview();
    }, []);

    const loadPreview = async () => {
        setLoading(true);
        setError("");
        const res = await getAssignmentPreviewAction(eventId, stage.id);
        if (res.error) setError(res.error);
        else setPreview(res.preview);
        setLoading(false);
    };

    const handleCommit = async () => {
        if (!preview || preview.diagnostic.status !== "VALID") return;
        setCommitting(true);
        setError("");
        const res = await commitAssignmentAction(eventId, stage.id, preview.configHash, preview.inputHash);
        if (res.error) {
            setError(res.error);
            setCommitting(false);
        }
    };

    if (loading) return <div className="text-sm p-4">Loading preview...</div>;
    if (error) return <div className="text-sm text-destructive-text p-4 bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>;
    
    const isReady = preview?.diagnostic?.status === "VALID";

    return (
        <div>
            <h4 className="text-sm font-bold mb-3">Assignment Preview</h4>
            
            {!isReady ? (
                <div className="bg-destructive/10 text-destructive-text border border-destructive/20 p-4 rounded-md mb-4 text-sm font-medium">
                    <strong>{preview?.diagnostic?.status}:</strong> {preview?.diagnostic?.reason}
                </div>
            ) : (
                <div className="space-y-4 mb-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted p-3 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Projects</div>
                            <div className="text-xl font-bold">{preview.stats.N}</div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Judges</div>
                            <div className="text-xl font-bold">{preview.stats.J}</div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Assignments</div>
                            <div className="text-xl font-bold">{preview.assignments?.length || 0}</div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                <button 
                    onClick={loadPreview} 
                    className="px-3 py-1.5 text-xs font-medium hover:bg-muted rounded border border-transparent transition-colors"
                >
                    Refresh Preview
                </button>
                <button 
                    disabled={!isReady || committing} 
                    onClick={handleCommit}
                    className="px-3 py-1.5 text-xs font-medium bg-success text-success-foreground rounded hover:bg-success/90 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                    <CheckCircle className="w-3 h-3" /> {committing ? "Committing..." : "Commit Assignments"}
                </button>
            </div>
        </div>
    );
}

function RubricManager({ eventId, stage }: { eventId: string, stage: any }) {
    const activeVersion = stage.rubrics?.[0];
    const initialCriteria = activeVersion?.criteria?.length ? activeVersion.criteria : [{ key: "", title: "", weightBasisPts: 0, maxScore: 5 }];
    
    const [criteria, setCriteria] = useState<any[]>(initialCriteria);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [opening, setOpening] = useState(false);

    const canEdit = ["DRAFT", "CONFIGURED"].includes(stage.state);
    const isConfigured = stage.state === "CONFIGURED";

    const totalWeight = criteria.reduce((acc, c) => acc + (Number(c.weightBasisPts) || 0), 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (totalWeight !== 10000) {
            setError(`Total weight must be exactly 10000 basis points. Current: ${totalWeight}`);
            return;
        }
        setSaving(true);
        const res = await saveRubricConfig(eventId, stage.id, criteria);
        setSaving(false);
        if (res.error) setError(res.error);
    };

    const handleOpen = async () => {
        if (!confirm("Are you sure? This will freeze the stage configuration and generate an assignment preview.")) return;
        setOpening(true);
        setError("");
        const res = await startAssignments(eventId, stage.id);
        setOpening(false);
        if (res.error) setError(res.error);
    };

    if (!canEdit) {
        return (
            <div>
                <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Active Rubric</h4>
                <div className="text-xs text-muted-foreground bg-muted/20 border border-border rounded p-3 mb-4 flex justify-between">
                    <div><strong>{activeVersion.criteria.length}</strong> Criteria</div>
                    <div>Configuration Frozen</div>
                </div>
                {/* Could list criteria here */}
            </div>
        );
    }

    return (
        <form onSubmit={handleSave}>
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold">Rubric Criteria</h4>
                <div className={`text-xs font-mono font-medium px-2 py-1 rounded ${totalWeight === 10000 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    Total Weight: {totalWeight} / 10000
                </div>
            </div>

            {error && <div className="mb-3 text-xs text-destructive-text bg-destructive/10 p-2 rounded border border-destructive/20 font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> {error}</div>}

            <div className="space-y-3 mb-4">
                {criteria.map((c, i) => (
                    <div key={i} className="flex gap-2 items-start">
                        <div className="flex-1">
                            <input required placeholder="Key (e.g. UX)" value={c.key} onChange={e => { const nc = [...criteria]; nc[i].key = e.target.value; setCriteria(nc); }} className="w-full p-1.5 text-xs bg-background border border-border rounded" />
                        </div>
                        <div className="flex-[2]">
                            <input required placeholder="Title (e.g. User Experience)" value={c.title} onChange={e => { const nc = [...criteria]; nc[i].title = e.target.value; setCriteria(nc); }} className="w-full p-1.5 text-xs bg-background border border-border rounded" />
                        </div>
                        <div className="w-24">
                            <input type="number" required placeholder="Weight (bps)" value={c.weightBasisPts || ''} onChange={e => { const nc = [...criteria]; nc[i].weightBasisPts = parseInt(e.target.value)||0; setCriteria(nc); }} className="w-full p-1.5 text-xs bg-background border border-border rounded" />
                        </div>
                        <div className="w-20">
                            <input type="number" required placeholder="Max" min="1" value={c.maxScore || ''} onChange={e => { const nc = [...criteria]; nc[i].maxScore = parseInt(e.target.value)||1; setCriteria(nc); }} className="w-full p-1.5 text-xs bg-background border border-border rounded" />
                        </div>
                        <button type="button" onClick={() => setCriteria(criteria.filter((_, idx) => idx !== i))} className="p-1.5 text-muted-foreground hover:text-destructive-text transition-colors">
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
                <button type="button" onClick={() => setCriteria([...criteria, { key: "", title: "", weightBasisPts: 0, maxScore: 5 }])} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Criterion
                </button>
                <div className="flex gap-2">
                    <button type="submit" disabled={saving || totalWeight !== 10000} className="px-3 py-1.5 text-xs font-medium bg-muted text-foreground rounded hover:bg-border transition-colors flex items-center gap-1">
                        <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save Rubric"}
                    </button>
                    {isConfigured && (
                        <button type="button" onClick={handleOpen} disabled={opening} className="px-3 py-1.5 text-xs font-medium bg-success text-success-foreground rounded hover:bg-success/90 transition-colors flex items-center gap-1 shadow-sm">
                            <PlayCircle className="w-3 h-3" /> {opening ? "Opening..." : "Open Judging"}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
