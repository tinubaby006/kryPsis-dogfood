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
        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 md:p-10 rounded-xl border border-border shadow-sm w-full">
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 rounded-md text-sm font-medium">{error}</div>
            )}
            
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Event Slug (URL identifier)</label>
                <input required pattern="^[a-z0-9-]+$" type="text" name="slug" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" placeholder="e.g. spring-hack-2026" />
                <p className="text-xs text-muted-foreground font-medium">Lowercase letters, numbers, and hyphens only.</p>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Event Name</label>
                <input required type="text" name="name" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Description</label>
                <textarea name="description" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Event Starts At</label>
                    <input type="datetime-local" name="startsAt" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Event Ends At</label>
                    <input type="datetime-local" name="endsAt" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Submissions Open At</label>
                    <input type="datetime-local" name="submissionsOpenAt" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-primary">Submissions Close At *</label>
                    <input required type="datetime-local" name="submissionsCloseAt" className="w-full bg-background border border-primary/50 text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_0_0_1px_rgba(225,29,72,0.1)]" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Max Team Size</label>
                    <input required type="number" name="maxTeamSize" min="1" max="20" defaultValue="4" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Visibility</label>
                    <select name="visibility" className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLIC">Public</option>
                    </select>
                </div>
            </div>

            <div className="pt-2">
                <button disabled={loading} type="submit" className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm">
                    {loading ? "Creating..." : "Create Event"}
                </button>
            </div>
        </form>
    );
}
