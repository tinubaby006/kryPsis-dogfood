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
        <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded bg-gray-50 max-w-sm">
            <h3 className="font-semibold mb-2">Create a Team</h3>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            <div className="flex gap-2">
                <input 
                    required 
                    type="text" 
                    name="name" 
                    placeholder="Team Name" 
                    className="border p-2 rounded flex-1"
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Creating..." : "Create"}
                </button>
            </div>
        </form>
    );
}
