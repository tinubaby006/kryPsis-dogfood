"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateInvite, revokeInvite } from "@/app/actions/invites";

export function TeamInviteManager({ teamId, eventId, activeInvites }: { teamId: string, eventId: string, activeInvites: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setNewToken(null);
        
        const formData = new FormData(e.currentTarget);
        const maxUses = parseInt(formData.get("maxUses") as string);
        const expireHours = parseInt(formData.get("expireHours") as string);

        const res = await generateInvite(teamId, eventId, maxUses, expireHours);
        if (res.error) {
            setError(res.error);
        } else {
            setNewToken(res.token!);
        }
        setLoading(false);
    }

    async function handleRevoke(inviteId: string) {
        if (!confirm("Are you sure you want to revoke this invitation?")) return;
        const res = await revokeInvite(inviteId, teamId, eventId);
        if (res.error) {
            alert(res.error);
        }
    }

    return (
        <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">Manage Invitations</h2>
            
            {newToken && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded mb-6">
                    <p className="font-semibold mb-2">Invitation Created!</p>
                    <p className="text-sm mb-2">Copy this link and share it securely with your teammate. It will only be shown once.</p>
                    <div className="bg-white border p-2 rounded font-mono text-sm break-all select-all">
                        {`${window.location.origin}/invite/${newToken}`}
                    </div>
                </div>
            )}

            {error && <div className="text-red-600 mb-4">{error}</div>}

            <form onSubmit={handleGenerate} className="bg-gray-50 p-4 border rounded mb-6 max-w-lg">
                <h3 className="font-semibold mb-3">Create New Invite Link</h3>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm mb-1">Max Uses</label>
                        <input type="number" name="maxUses" min="1" max="10" defaultValue="1" className="w-full border p-2 rounded" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm mb-1">Expires In (Hours)</label>
                        <select name="expireHours" className="w-full border p-2 rounded">
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="168">7 Days</option>
                        </select>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                    {loading ? "Generating..." : "Generate Link"}
                </button>
            </form>

            <h3 className="font-semibold mb-3">Active Invitations</h3>
            {activeInvites.length === 0 ? (
                <p className="text-gray-500 text-sm">No active invitations.</p>
            ) : (
                <div className="space-y-3">
                    {activeInvites.map(inv => (
                        <div key={inv.id} className="border p-4 rounded flex justify-between items-center bg-white shadow-sm">
                            <div>
                                <p className="text-sm font-medium">Uses: {inv.uses} / {inv.maxUses}</p>
                                <p className="text-xs text-gray-500">Expires: {new Date(inv.expiresAt).toLocaleString()}</p>
                            </div>
                            <button 
                                onClick={() => handleRevoke(inv.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
