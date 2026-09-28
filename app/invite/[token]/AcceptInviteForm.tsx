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
        <form onSubmit={handleAccept} className="mt-8 text-center">
            {error && <div className="text-destructive-text mb-6 font-medium bg-destructive/10 p-4 rounded-md border border-destructive/20">{error}</div>}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
            >
                {loading ? "Joining..." : "Accept Invitation & Join Team"}
            </button>
        </form>
    );
}
