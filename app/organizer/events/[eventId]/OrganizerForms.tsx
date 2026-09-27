"use client";

import { useState } from "react";
import { addCustomQuestion, addTrack } from "@/app/actions/organizer";
import { QuestionType } from "@prisma/client";

export function AddTrackForm({ eventId }: { eventId: string }) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await addTrack(eventId, name);
            setName("");
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="mt-4 flex space-x-2">
            <input type="text" placeholder="Track Name" className="border p-2 rounded flex-1" value={name} onChange={e => setName(e.target.value)} />
            <button disabled={loading} onClick={handleAdd} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">Add Track</button>
        </div>
    );
}

export function AddQuestionForm({ eventId, disabled }: { eventId: string, disabled: boolean }) {
    const [label, setLabel] = useState("");
    const [required, setRequired] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!label.trim()) return;
        setLoading(true);
        try {
            await addCustomQuestion(eventId, label, "TEXT", required);
            setLabel("");
            setRequired(false);
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    if (disabled) return null;

    return (
        <div className="mt-4 border-t pt-4">
            <div className="flex flex-col space-y-2">
                <input type="text" placeholder="Question Label (e.g. GitHub URL)" className="border p-2 rounded" value={label} onChange={e => setLabel(e.target.value)} />
                <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
                    <span>Required</span>
                </label>
                <button disabled={loading} onClick={handleAdd} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Text Question</button>
            </div>
        </div>
    );
}
