"use client";

import { useState } from "react";
import { addCustomQuestion, addTrack, addPrize, deleteTrack, deleteCustomQuestion, deletePrize, updateEventDetails } from "@/app/actions/organizer";
import { QuestionType } from "@prisma/client";
import { Trash2 } from "lucide-react";

export function EditEventDetailsForm({ event }: { event: any }) {
    const [name, setName] = useState(event.name);
    const [visibility, setVisibility] = useState<"DRAFT" | "PUBLIC">(event.visibility);
    const [maxTeamSize, setMaxTeamSize] = useState(event.maxTeamSize.toString());
    const [closesAt, setClosesAt] = useState(
        event.submissionsCloseAt ? new Date(event.submissionsCloseAt).toISOString().slice(0, 16) : ""
    );
    const [timeZone, setTimeZone] = useState(event.timeZone || "UTC");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateEventDetails(event.id, {
                name,
                visibility,
                maxTeamSize: parseInt(maxTeamSize, 10) || 4,
                submissionsCloseAt: closesAt ? new Date(closesAt).toISOString() : new Date().toISOString(),
                timeZone
            });
            alert("Event updated successfully!");
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    const inputClasses = "border border-border bg-background text-foreground p-2.5 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-primary text-sm";
    const labelClasses = "block text-sm font-medium mb-1.5 text-muted-foreground";

    return (
        <div className="flex flex-col space-y-5">
            <div>
                <label className={labelClasses}>Event Name</label>
                <input type="text" className={inputClasses} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
                <label className={labelClasses}>Visibility</label>
                <select className={inputClasses} value={visibility} onChange={e => setVisibility(e.target.value as any)}>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLIC">PUBLIC</option>
                </select>
            </div>
            <div>
                <label className={labelClasses}>Max Team Size</label>
                <input type="number" className={inputClasses} value={maxTeamSize} onChange={e => setMaxTeamSize(e.target.value)} />
            </div>
            <div>
                <label className={labelClasses}>Submissions Close At (Local Time)</label>
                <input type="datetime-local" className={`${inputClasses} mb-3`} value={closesAt} onChange={e => setClosesAt(e.target.value)} />
                <label className={labelClasses}>Timezone (IANA)</label>
                <input type="text" placeholder="e.g. UTC, Asia/Kolkata, America/New_York" className={inputClasses} value={timeZone} onChange={e => setTimeZone(e.target.value)} />
            </div>
            <div className="pt-2">
                <button disabled={loading} onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium text-sm w-full sm:w-auto">
                    Save Event Details
                </button>
            </div>
        </div>
    );
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
            <Trash2 className="w-4 h-4" />
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
        <div className="mt-4 pt-4 border-t border-border flex gap-3">
            <input 
                type="text" 
                placeholder="Track Name" 
                className="border border-border bg-background text-foreground p-2 rounded-md flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" 
                value={name} 
                onChange={e => setName(e.target.value)} 
            />
            <button disabled={loading} onClick={handleAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50">Add Track</button>
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
        <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-col space-y-3">
                <input 
                    type="text" 
                    placeholder="Question Label (e.g. GitHub URL)" 
                    className="border border-border bg-background text-foreground p-2.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" 
                    value={label} 
                    onChange={e => setLabel(e.target.value)} 
                />
                <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-sm text-foreground cursor-pointer">
                        <input type="checkbox" className="rounded border-border bg-background text-primary focus:ring-primary accent-primary w-4 h-4" checked={required} onChange={e => setRequired(e.target.checked)} />
                        <span>Required</span>
                    </label>
                    <button disabled={loading} onClick={handleAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50">Add Question</button>
                </div>
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

    const inputClasses = "border border-border bg-background text-foreground p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground";

    return (
        <div className="mt-4 border-t border-border pt-4 flex flex-col space-y-3">
            <input type="text" placeholder="Prize Name (e.g. Grand Prize)" className={inputClasses} value={name} onChange={e => setName(e.target.value)} />
            <textarea placeholder="Description" className={`${inputClasses} h-20 resize-none`} value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex space-x-3">
                <input type="number" placeholder="Amount (Optional)" className={`${inputClasses} flex-1`} value={amount} onChange={e => setAmount(e.target.value)} />
                <input type="text" placeholder="Currency" className={`${inputClasses} w-24 uppercase`} value={currency} onChange={e => setCurrency(e.target.value)} />
            </div>
            <div className="pt-2">
                <button disabled={loading} onClick={handleAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary-hover transition-colors font-medium text-sm disabled:opacity-50 w-full sm:w-auto">Add Prize</button>
            </div>
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
        <li className="flex justify-between items-center group p-3 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-colors">
            <span className="text-sm font-medium text-foreground">{track.name}</span>
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${loading ? 'opacity-50' : ''}`}>
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
        <li className="flex justify-between items-center group p-3 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-colors">
            <div>
                <span className="text-sm font-medium text-foreground">{question.label}</span>
                <span className="text-xs text-muted-foreground ml-2">({question.type}) {question.required ? <span className="text-primary font-medium ml-1">*Required</span> : ''}</span>
            </div>
            {!disabled && (
                <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${loading ? 'opacity-50' : ''}`}>
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
        <li className="flex justify-between items-center group p-3 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-colors">
            <div>
                <div className="text-sm font-medium text-foreground">{prize.name}</div>
                {prize.amount && (
                    <div className="text-xs font-semibold text-success mt-0.5">{prize.amount} {prize.currency}</div>
                )}
            </div>
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                <DeleteButton onClick={handleDelete} />
            </div>
        </li>
    );
}
