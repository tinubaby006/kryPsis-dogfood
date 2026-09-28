"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeam } from "@/app/actions/teams";

export function CreateTeamForm({ eventId }: { eventId: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;

        const res = await createTeam(eventId, name);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push(`/events/${eventId}/team`);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-5 border border-border rounded-xl bg-background shadow-sm">
            <h3 className="font-semibold mb-3 text-foreground font-heading">Create a Team</h3>
            {error && <div className="text-destructive-text text-sm mb-3 font-medium bg-destructive/10 p-2 rounded">{error}</div>}
            <div className="flex flex-col gap-3">
                <input 
                    required 
                    type="text" 
                    name="name" 
                    placeholder="Team Name" 
                    className="w-full border border-border bg-card text-foreground p-2.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground px-5 py-2.5 rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium text-sm"
                >
                    {loading ? "Creating..." : "Create"}
                </button>
            </div>
        </form>
    );
}
