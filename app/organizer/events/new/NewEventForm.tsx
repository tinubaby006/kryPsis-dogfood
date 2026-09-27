"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/app/actions/events";

export function NewEventForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const formData = new FormData(e.currentTarget);
        const data = {
            slug: formData.get("slug") as string,
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            startsAt: formData.get("startsAt") as string || null,
            endsAt: formData.get("endsAt") as string || null,
            submissionsOpenAt: formData.get("submissionsOpenAt") as string || null,
            submissionsCloseAt: formData.get("submissionsCloseAt") as string,
            visibility: formData.get("visibility") as any,
            maxTeamSize: parseInt(formData.get("maxTeamSize") as string || "4"),
        };

        const res = await createEvent(data);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push(`/organizer/events/${res.eventId}`);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded border shadow-sm max-w-2xl">
            {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded text-sm">{error}</div>
            )}
            
            <div className="space-y-2">
                <label className="block text-sm font-medium">Event Slug (URL identifier)</label>
                <input required pattern="^[a-z0-9-]+$" type="text" name="slug" className="w-full border rounded p-2" placeholder="e.g. spring-hack-2026" />
                <p className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only.</p>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Event Name</label>
                <input required type="text" name="name" className="w-full border rounded p-2" />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Description</label>
                <textarea name="description" className="w-full border rounded p-2" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Event Starts At</label>
                    <input type="datetime-local" name="startsAt" className="w-full border rounded p-2" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Event Ends At</label>
                    <input type="datetime-local" name="endsAt" className="w-full border rounded p-2" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Submissions Open At</label>
                    <input type="datetime-local" name="submissionsOpenAt" className="w-full border rounded p-2" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-red-600">Submissions Close At *</label>
                    <input required type="datetime-local" name="submissionsCloseAt" className="w-full border rounded p-2 border-red-200" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Max Team Size</label>
                    <input required type="number" name="maxTeamSize" min="1" max="20" defaultValue="4" className="w-full border rounded p-2" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Visibility</label>
                    <select name="visibility" className="w-full border rounded p-2">
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLIC">Public</option>
                    </select>
                </div>
            </div>

            <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Creating..." : "Create Event"}
            </button>
        </form>
    );
}
