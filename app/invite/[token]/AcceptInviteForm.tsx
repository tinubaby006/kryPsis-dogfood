"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({ token }: { token: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAccept(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/invites/${token}/accept`, {
                method: "POST"
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error?.message || "Failed to join team");
                setLoading(false);
            } else {
                router.push(`/events/${data.data.eventId}/team`);
            }
        } catch (err) {
            setError("Network error occurred");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleAccept} className="mt-6 text-center">
            {error && <div className="text-red-600 mb-4 font-medium">{error}</div>}
            <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Joining..." : "Accept Invitation & Join Team"}
            </button>
        </form>
    );
}
