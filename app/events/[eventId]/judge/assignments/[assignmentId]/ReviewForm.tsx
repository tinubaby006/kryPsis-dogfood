"use client";

import { useState } from "react";
import { saveDraftAction, submitReviewAction } from "./actions";
import { AlertCircle, CheckCircle, Save } from "lucide-react";
import Link from "next/link";

export function ReviewForm({ eventId, assignmentId, rubric, draft, finalReview }: { eventId: string, assignmentId: string, rubric: any, draft: any, finalReview: any }) {
    const isSubmitted = !!finalReview;
    
    // Initialize state from finalReview if it exists, otherwise draft, otherwise 0
    const initialScores = isSubmitted ? 
        finalReview.scores.reduce((acc: any, s: any) => ({ ...acc, [s.criterionId]: s.value }), {}) :
        draft?.scores ? draft.scores : {};
        
    const [scores, setScores] = useState<Record<string, number>>(initialScores);
    const [comment, setComment] = useState(isSubmitted ? finalReview.comment || "" : draft?.comment || "");
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        const res = await saveDraftAction(eventId, assignmentId, scores, comment);
        setSaving(false);
        if (res.error) setError(res.error);
        else setSuccess("Draft saved successfully.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Are you sure? Once submitted, the review cannot be edited.")) return;
        setSubmitting(true);
        setError("");
        setSuccess("");
        const res = await submitReviewAction(eventId, assignmentId, scores, comment);
        setSubmitting(false);
        if (res.error) setError(res.error);
        else setSuccess("Review submitted successfully!");
    };

    if (isSubmitted) {
        return (
            <div className="bg-success/10 border border-success/20 rounded-xl p-6">
                <h3 className="text-success font-bold flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    Review Submitted
                </h3>
                <div className="space-y-4">
                    {rubric.criteria.map((c: any) => (
                        <div key={c.id} className="flex justify-between items-center bg-card p-3 rounded shadow-sm border border-border">
                            <div>
                                <div className="font-bold text-foreground">{c.title}</div>
                            </div>
                            <div className="font-mono font-bold text-lg text-foreground">
                                {scores[c.id]} <span className="text-muted-foreground text-sm">/ {c.maxScore}</span>
                            </div>
                        </div>
                    ))}
                    {comment && (
                        <div className="bg-card p-4 rounded shadow-sm border border-border mt-4">
                            <h4 className="font-bold text-sm mb-2 text-foreground">Comments</h4>
                            <p className="text-foreground whitespace-pre-wrap">{comment}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-destructive/10 text-destructive-text p-4 rounded-md border border-destructive/20 flex items-start gap-2 text-sm font-medium"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
            {success && <div className="bg-success/10 text-success p-4 rounded-md border border-success/20 flex items-start gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4 mt-0.5" />{success}</div>}

            <div className="space-y-4">
                {rubric.criteria.map((c: any) => (
                    <div key={c.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-foreground">{c.title}</h4>
                            <div className="text-sm text-muted-foreground font-medium">Max: {c.maxScore}</div>
                        </div>
                        <input 
                            type="range"
                            min="0"
                            max={c.maxScore}
                            step="1"
                            value={scores[c.id] || 0}
                            onChange={e => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-mono">0</span>
                            <span className="font-mono font-bold text-xl text-primary">{scores[c.id] || 0}</span>
                            <span className="text-xs text-muted-foreground font-mono">{c.maxScore}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <h4 className="font-bold text-foreground mb-3">Feedback / Comments</h4>
                <textarea 
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Provide constructive feedback for the team..."
                    className="w-full p-3 bg-background border border-border text-foreground rounded focus:ring-2 focus:ring-primary focus:border-transparent resize-y text-sm placeholder:text-muted-foreground"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button 
                    type="button" 
                    onClick={handleSave}
                    disabled={saving || submitting}
                    className="px-4 py-2 text-sm font-medium bg-muted/50 text-foreground rounded-md border border-border hover:bg-muted focus:ring-2 focus:ring-ring flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Draft"}
                </button>
                <button 
                    type="submit" 
                    disabled={saving || submitting}
                    className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary-hover focus:ring-2 focus:ring-ring flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                    <CheckCircle className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Review"}
                </button>
            </div>
        </form>
    );
}
