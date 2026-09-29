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
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-green-800 font-bold flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    Review Submitted
                </h3>
                <div className="space-y-4">
                    {rubric.criteria.map((c: any) => (
                        <div key={c.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-green-100">
                            <div>
                                <div className="font-bold text-gray-900">{c.title}</div>
                            </div>
                            <div className="font-mono font-bold text-lg text-gray-900">
                                {scores[c.id]} <span className="text-gray-400 text-sm">/ {c.maxScore}</span>
                            </div>
                        </div>
                    ))}
                    {comment && (
                        <div className="bg-white p-4 rounded shadow-sm border border-green-100 mt-4">
                            <h4 className="font-bold text-sm mb-2 text-gray-700">Comments</h4>
                            <p className="text-gray-900 whitespace-pre-wrap">{comment}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 flex items-start gap-2 text-sm font-medium"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 flex items-start gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4 mt-0.5" />{success}</div>}

            <div className="space-y-4">
                {rubric.criteria.map((c: any) => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-900">{c.title}</h4>
                            <div className="text-sm text-gray-500 font-medium">Max: {c.maxScore}</div>
                        </div>
                        <input 
                            type="range"
                            min="0"
                            max={c.maxScore}
                            step="1"
                            value={scores[c.id] || 0}
                            onChange={e => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400 font-mono">0</span>
                            <span className="font-mono font-bold text-xl text-blue-600">{scores[c.id] || 0}</span>
                            <span className="text-xs text-gray-400 font-mono">{c.maxScore}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3">Feedback / Comments</h4>
                <textarea 
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Provide constructive feedback for the team..."
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-y text-sm"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button 
                    type="button" 
                    onClick={handleSave}
                    disabled={saving || submitting}
                    className="px-4 py-2 text-sm font-medium bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Draft"}
                </button>
                <button 
                    type="submit" 
                    disabled={saving || submitting}
                    className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <CheckCircle className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Review"}
                </button>
            </div>
        </form>
    );
}
