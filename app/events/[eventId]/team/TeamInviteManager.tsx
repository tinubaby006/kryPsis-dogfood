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
        <div className="mt-8 border-t border-border pt-8">
            <h2 className="text-xl font-bold mb-6 font-heading text-foreground">Manage Invitations</h2>
            
            {newToken && (
                <div className="bg-success/10 border border-success/20 text-success-text p-5 rounded-lg mb-8 shadow-sm">
                    <p className="font-bold mb-2 flex items-center gap-2 text-success">Invitation Created!</p>
                    <p className="text-sm mb-4">Copy this link and share it securely with your teammate. It will only be shown once.</p>
                    <div className="bg-background border border-border p-3 rounded-md font-mono text-sm break-all select-all text-foreground">
                        {`${window.location.origin}/invite/${newToken}`}
                    </div>
                </div>
            )}

            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 rounded-md mb-6 text-sm font-medium">{error}</div>}

            <form onSubmit={handleGenerate} className="bg-card p-6 md:p-8 border border-border rounded-xl mb-10 shadow-sm max-w-xl">
                <h3 className="font-bold mb-6 font-heading text-foreground border-b border-border pb-3">Create New Invite Link</h3>
                <div className="flex flex-col sm:flex-row gap-5 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Max Uses</label>
                        <input type="number" name="maxUses" min="1" max="10" defaultValue="1" className="w-full bg-background border border-border text-foreground p-2.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Expires In (Hours)</label>
                        <select name="expireHours" className="w-full bg-background border border-border text-foreground p-2.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours</option>
                            <option value="168">7 Days</option>
                        </select>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium text-sm shadow-sm">
                    {loading ? "Generating..." : "Generate Link"}
                </button>
            </form>

            <h3 className="font-bold mb-4 font-heading text-foreground">Active Invitations</h3>
            {activeInvites.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 bg-muted/30 border border-border rounded-lg text-center">No active invitations.</p>
            ) : (
                <div className="space-y-3 max-w-xl">
                    {activeInvites.map(inv => (
                        <div key={inv.id} className="border border-border p-4 rounded-lg flex justify-between items-center bg-card shadow-sm hover:border-primary/30 transition-colors">
                            <div>
                                <p className="text-sm font-semibold text-foreground mb-1">Uses: {inv.uses} / {inv.maxUses}</p>
                                <p className="text-xs text-muted-foreground font-medium">Expires: {new Date(inv.expiresAt).toLocaleString()}</p>
                            </div>
                            <button 
                                onClick={() => handleRevoke(inv.id)}
                                className="text-destructive-text hover:underline text-sm font-medium px-3 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
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
