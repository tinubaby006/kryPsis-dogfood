"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProject, ProjectPayload } from "@/app/actions/projects";

export default function ProjectEditorClient({ event, team, initialProject }: any) {
    const router = useRouter();
    const [title, setTitle] = useState(initialProject?.title || "");
    const [summary, setSummary] = useState(initialProject?.summary || "");
    const [description, setDescription] = useState(initialProject?.description || "");
    const [repoUrl, setRepoUrl] = useState(initialProject?.repoUrl || "");
    const [liveUrl, setLiveUrl] = useState(initialProject?.liveUrl || "");
    const [demoVideoUrl, setDemoVideoUrl] = useState(initialProject?.demoVideoUrl || "");
    const [techTags, setTechTags] = useState<string>(initialProject?.techTags?.join(", ") || "");
    const [trackId, setTrackId] = useState(initialProject?.trackId || "");
    
    // Map initial answers
    const initAns: Record<string, any> = {};
    if (initialProject?.answers) {
        for (const a of initialProject.answers) {
            initAns[a.questionId] = a.value;
        }
    }
    const [answers, setAnswers] = useState<Record<string, any>>(initAns);
    
    const [assets, setAssets] = useState<any[]>(initialProject?.assets || []);
    const [version, setVersion] = useState(initialProject?.version || 1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const isClosed = new Date() > new Date(event.submissionsCloseAt);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "THUMBNAIL" | "GALLERY") => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            const newAsset = {
                storageKey: data.storageKey,
                originalName: data.originalName,
                mimeType: data.mimeType,
                bytes: data.bytes,
                kind,
                sortOrder: assets.length
            };
            setAssets([...assets, newAsset]);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSave = async (status: "DRAFT" | "SUBMITTED") => {
        setLoading(true);
        setError("");

        const payload: ProjectPayload = {
            projectId: initialProject?.id,
            eventId: event.id,
            teamId: team.id,
            title,
            summary,
            description,
            repoUrl,
            liveUrl,
            demoVideoUrl,
            techTags: techTags.split(",").map(t => t.trim()).filter(t => t),
            trackId: trackId || undefined,
            status,
            version,
            assets,
            answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value }))
        };

        const res = await upsertProject(payload);
        setLoading(false);

        if (res.success) {
            if (res.project) {
                setVersion(res.project.version);
            }
            alert(`Project ${status.toLowerCase()} successfully!`);
            router.refresh();
        } else {
            setError(res.error || "Failed to save project");
            if (res.error?.includes("409 CONFLICT")) {
                alert("Conflict: Another team member modified this project. Please refresh.");
            }
        }
    };

    const inputClasses = "w-full border border-border bg-background text-foreground p-2.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground";
    const labelClasses = "block text-sm font-medium mb-1.5 text-foreground";
    const sectionClasses = "bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm";
    const sectionTitleClasses = "text-xl font-bold font-heading mb-6 border-b border-border pb-3 flex items-center gap-2 text-foreground";

    return (
        <div className="space-y-8">
            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 rounded-md font-medium text-sm">{error}</div>}
            {isClosed && <div className="bg-warning/10 border border-warning/20 text-warning p-4 rounded-md font-medium text-sm">Submissions are currently closed.</div>}

            <div className={sectionClasses}>
                <h2 className={sectionTitleClasses}>1. Basics</h2>
                <div className="space-y-5">
                    <div>
                        <label className={labelClasses}>Project Title <span className="text-primary">*</span></label>
                        <input type="text" className={inputClasses} value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>Summary (Short)</label>
                        <input type="text" className={inputClasses} value={summary} onChange={e => setSummary(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>Track</label>
                        <select className={inputClasses} value={trackId} onChange={e => setTrackId(e.target.value)}>
                            <option value="">-- No Track --</option>
                            {event.tracks.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className={sectionClasses}>
                <h2 className={sectionTitleClasses}>2. Details & Links</h2>
                <div className="space-y-5">
                    <div>
                        <label className={labelClasses}>Detailed Description</label>
                        <textarea className={`${inputClasses} h-40 resize-y`} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClasses}>Repository URL</label>
                            <input type="url" className={inputClasses} value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClasses}>Live URL</label>
                            <input type="url" className={inputClasses} value={liveUrl} onChange={e => setLiveUrl(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>Tech Tags (comma separated)</label>
                        <input type="text" className={inputClasses} value={techTags} onChange={e => setTechTags(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className={sectionClasses}>
                <h2 className={sectionTitleClasses}>3. Media & Assets</h2>
                <div className="space-y-5">
                    <div>
                        <label className={labelClasses}>Thumbnail (JPEG, PNG, WebP &lt; 5MB)</label>
                        <input type="file" className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" accept="image/jpeg, image/png, image/webp" onChange={e => handleFileUpload(e, "THUMBNAIL")} />
                    </div>
                    {assets.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4">
                            {assets.map(a => (
                                <div key={a.storageKey} className="relative w-32 h-32 border border-border rounded-lg overflow-hidden shadow-sm">
                                    <img src={`/api/assets/${a.storageKey}`} className="w-full h-full object-cover" alt="Asset" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {event.customQuestions.length > 0 && (
                <div className={sectionClasses}>
                    <h2 className={sectionTitleClasses}>4. Custom Questions</h2>
                    <div className="space-y-5">
                        {event.customQuestions.map((q: any) => (
                            <div key={q.id}>
                                <label className={labelClasses}>{q.label} {q.required && <span className="text-primary">*</span>}</label>
                                <input 
                                    type="text" 
                                    className={inputClasses}
                                    value={answers[q.id] || ""}
                                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button 
                    disabled={loading}
                    onClick={() => handleSave("DRAFT")}
                    className="px-6 py-3 bg-muted border border-border text-foreground font-medium text-sm rounded-md hover:bg-muted-foreground/20 disabled:opacity-50 transition-colors"
                >
                    Save as Draft
                </button>
                <button 
                    disabled={loading || isClosed}
                    onClick={() => handleSave("SUBMITTED")}
                    className="px-6 py-3 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
                >
                    Submit Final Project
                </button>
            </div>
        </div>
    );
}
