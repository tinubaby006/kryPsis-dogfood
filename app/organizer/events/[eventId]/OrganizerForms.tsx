"use client";

import { useState } from "react";
import { addCustomQuestion, addTrack, addPrize, deleteTrack, deleteCustomQuestion, deletePrize, updateEventDetails } from "@/app/actions/organizer";
import { QuestionType } from "@prisma/client";

export function EditEventDetailsForm({ event }: { event: any }) {
    const [name, setName] = useState(event.name);
    const [visibility, setVisibility] = useState<"DRAFT" | "PUBLIC">(event.visibility);
    const [maxTeamSize, setMaxTeamSize] = useState(event.maxTeamSize.toString());
    const [closesAt, setClosesAt] = useState(
        event.submissionsCloseAt ? new Date(event.submissionsCloseAt).toISOString().slice(0, 16) : ""
    );
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEventDetails(event.id, {
                name,
                visibility,
                maxTeamSize: parseInt(maxTeamSize, 10) || 4,
                submissionsCloseAt: closesAt ? new Date(closesAt).toISOString() : new Date().toISOString()
            });
            alert("Event updated successfully!");
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Event Name</label>
                <input type="text" className="border p-2 rounded w-full" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Visibility</label>
                <select className="border p-2 rounded w-full" value={visibility} onChange={e => setVisibility(e.target.value as any)}>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLIC">PUBLIC</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Max Team Size</label>
                <input type="number" className="border p-2 rounded w-full" value={maxTeamSize} onChange={e => setMaxTeamSize(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Submissions Close At (Local Time)</label>
                <input type="datetime-local" className="border p-2 rounded w-full" value={closesAt} onChange={e => setClosesAt(e.target.value)} />
            </div>
            <button disabled={loading} onClick={handleSave} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Save Event Details</button>
        </div>
    );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="text-red-500 hover:text-red-700 text-sm ml-2">
            Delete
        </button>
    );
}

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

export function AddPrizeForm({ eventId }: { eventId: string }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const numAmount = amount ? parseFloat(amount) : undefined;
            await addPrize(eventId, name, description, numAmount, currency);
            setName("");
            setDescription("");
            setAmount("");
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="mt-4 border-t pt-4 flex flex-col space-y-2">
            <input type="text" placeholder="Prize Name (e.g. Grand Prize)" className="border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
            <textarea placeholder="Description" className="border p-2 rounded h-20" value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex space-x-2">
                <input type="number" placeholder="Amount (Optional)" className="border p-2 rounded flex-1" value={amount} onChange={e => setAmount(e.target.value)} />
                <input type="text" placeholder="Currency" className="border p-2 rounded w-24" value={currency} onChange={e => setCurrency(e.target.value)} />
            </div>
            <button disabled={loading} onClick={handleAdd} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Prize</button>
        </div>
    );
}

export function TrackItem({ track, eventId }: { track: any, eventId: string }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        await deleteTrack(eventId, track.id).catch(e => alert(e.message));
        setLoading(false);
    };
    return (
        <li className="flex justify-between items-center group">
            <span>{track.name}</span>
            <div className={`opacity-0 group-hover:opacity-100 ${loading ? 'opacity-50' : ''}`}>
                <DeleteButton onClick={handleDelete} />
            </div>
        </li>
    );
}

export function QuestionItem({ question, eventId, disabled }: { question: any, eventId: string, disabled: boolean }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        await deleteCustomQuestion(eventId, question.id).catch(e => alert(e.message));
        setLoading(false);
    };
    return (
        <li className="flex justify-between items-center group">
            <span>{question.label} <span className="text-xs text-gray-400">({question.type}) {question.required ? '*Required' : ''}</span></span>
            {!disabled && (
                <div className={`opacity-0 group-hover:opacity-100 ${loading ? 'opacity-50' : ''}`}>
                    <DeleteButton onClick={handleDelete} />
                </div>
            )}
        </li>
    );
}

export function PrizeItem({ prize, eventId }: { prize: any, eventId: string }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        if (!confirm("Are you sure?")) return;
        setLoading(true);
        await deletePrize(eventId, prize.id).catch(e => alert(e.message));
        setLoading(false);
    };
    return (
        <li className="flex justify-between items-center group">
            <span>{prize.name} {prize.amount ? `- ${prize.amount} ${prize.currency}` : ''}</span>
            <div className={`opacity-0 group-hover:opacity-100 ${loading ? 'opacity-50' : ''}`}>
                <DeleteButton onClick={handleDelete} />
            </div>
        </li>
    );
}
