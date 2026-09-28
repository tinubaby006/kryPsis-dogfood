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

    return (
        <div className="bg-white p-6 border rounded shadow-sm">
            {error && <div className="bg-red-50 text-red-700 p-3 mb-4 rounded">{error}</div>}
            {isClosed && <div className="bg-yellow-50 text-yellow-800 p-3 mb-4 rounded font-bold">Submissions are currently closed.</div>}

            <div className="space-y-4">
                <div>
                    <label className="block font-medium mb-1">Project Title</label>
                    <input type="text" className="w-full border p-2 rounded" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                    <label className="block font-medium mb-1">Summary (Short)</label>
                    <input type="text" className="w-full border p-2 rounded" value={summary} onChange={e => setSummary(e.target.value)} />
                </div>
                <div>
                    <label className="block font-medium mb-1">Detailed Description</label>
                    <textarea className="w-full border p-2 rounded h-32" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                    <label className="block font-medium mb-1">Track</label>
                    <select className="w-full border p-2 rounded" value={trackId} onChange={e => setTrackId(e.target.value)}>
                        <option value="">-- No Track --</option>
                        {event.tracks.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium mb-1">Repository URL</label>
                        <input type="url" className="w-full border p-2 rounded" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className="block font-medium mb-1">Live URL</label>
                        <input type="url" className="w-full border p-2 rounded" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block font-medium mb-1">Tech Tags (comma separated)</label>
                    <input type="text" className="w-full border p-2 rounded" value={techTags} onChange={e => setTechTags(e.target.value)} />
                </div>

                <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-lg mb-2">Media & Assets</h3>
                    <div className="mb-4">
                        <label className="block font-medium mb-1">Thumbnail (JPEG, PNG, WebP &lt; 5MB)</label>
                        <input type="file" accept="image/jpeg, image/png, image/webp" onChange={e => handleFileUpload(e, "THUMBNAIL")} />
                    </div>
                    {assets.length > 0 && (
                        <div className="flex gap-2">
                            {assets.map(a => (
                                <div key={a.storageKey} className="relative w-24 h-24 border">
                                    <img src={`/api/assets/${a.storageKey}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {event.customQuestions.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                        <h3 className="font-bold text-lg mb-2">Custom Questions</h3>
                        {event.customQuestions.map((q: any) => (
                            <div key={q.id} className="mb-3">
                                <label className="block font-medium mb-1">{q.label} {q.required && <span className="text-red-500">*</span>}</label>
                                <input 
                                    type="text" 
                                    className="w-full border p-2 rounded"
                                    value={answers[q.id] || ""}
                                    onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
                <button 
                    disabled={loading}
                    onClick={() => handleSave("DRAFT")}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                    Save as Draft
                </button>
                <button 
                    disabled={loading || isClosed}
                    onClick={() => handleSave("SUBMITTED")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    Submit Project
                </button>
            </div>
        </div>
    );
}
