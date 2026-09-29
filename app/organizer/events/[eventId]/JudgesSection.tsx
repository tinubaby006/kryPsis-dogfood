"use client";

import { useState, useEffect } from "react";

export function JudgesSection({ eventId, tracks }: { eventId: string, tracks: {id: string, name: string}[] }) {
    const [accesses, setAccesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAccesses();
    }, [eventId]);

    const fetchAccesses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access`);
            if (!res.ok) throw new Error("Failed to load judges");
            const data = await res.json();
            setAccesses(data.accesses);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, trackIds: selectedTracks })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.rawToken) {
                const inviteUrl = `${window.location.origin}/judge-invitations/${data.rawToken}`;
                prompt("Invitation created! Copy this link and send it to the judge:", inviteUrl);
            } else {
                alert("Judge access granted!");
            }
            setEmail("");
            setSelectedTracks([]);
            fetchAccesses();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (accessId: string) => {
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access/${accessId}/confirm`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchAccesses();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRevoke = async (accessId: string) => {
        if (!confirm("Revoke this access?")) return;
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access/${accessId}/revoke`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchAccesses();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRenew = async (accessId: string) => {
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access/${accessId}/renew`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const inviteUrl = `${window.location.origin}/judge-invitations/${data.rawToken}`;
            prompt("Invitation renewed! Copy this new link:", inviteUrl);
            fetchAccesses();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleReactivate = async (accessId: string) => {
        try {
            const res = await fetch(`/api/events/${eventId}/judge-access/${accessId}/reactivate`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchAccesses();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-sm mt-8">
            <h2 className="text-xl font-bold mb-6 font-heading border-b border-border pb-3 text-foreground">Judges</h2>
            
            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 rounded-md text-sm mb-6 font-medium">{error}</div>}

            <form onSubmit={handleGrant} className="mb-8 bg-muted/30 p-6 rounded-lg border border-border">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Provision Judge Access</h3>
                <div className="space-y-4">
                    <div>
                        <input 
                            type="email" 
                            required 
                            className="w-full p-2.5 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" 
                            placeholder="Judge email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground mb-2">Select tracks for this judge (required):</p>
                        <div className="flex flex-wrap gap-2.5">
                            {tracks.map(t => (
                                <label key={t.id} className="inline-flex items-center text-sm bg-background border border-border px-3 py-1.5 rounded-md cursor-pointer hover:border-primary/50 transition-colors text-foreground">
                                    <input 
                                        type="checkbox" 
                                        className="mr-2"
                                        checked={selectedTracks.includes(t.id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedTracks([...selectedTracks, t.id]);
                                            else setSelectedTracks(selectedTracks.filter(id => id !== t.id));
                                        }}
                                    />
                                    {t.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={submitting || selectedTracks.length === 0}
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {submitting ? "Processing..." : "Grant / Create Invite"}
                        </button>
                    </div>
                </div>
            </form>

            {loading ? (
                <div className="text-sm text-muted-foreground p-4 text-center">Loading judges...</div>
            ) : accesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-muted/10">
                    <h3 className="text-lg font-bold text-foreground mb-1">No Judges Provisioned</h3>
                    <p className="text-sm text-muted-foreground max-w-md">Use the form above to grant judging access to user emails and assign them to specific tracks.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {accesses.map(a => (
                        <li key={a.id} className="border border-border bg-background rounded-lg p-4 text-sm flex justify-between items-start shadow-sm">
                            <div>
                                <div className="font-semibold text-foreground">{a.user?.name || a.emailNormalized}</div>
                                <div className="text-muted-foreground text-xs mb-2">{a.emailNormalized}</div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {a.tracks.map((t: any) => (
                                        <span key={t.id} className="bg-muted text-muted-foreground border border-border text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border inline-block ${
                                    a.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                                    a.status === 'INVITED' ? 'bg-warning/10 text-warning border-warning/20' :
                                    a.status === 'AWAITING_CONFIRMATION' ? 'bg-primary/10 text-primary border-primary/20' :
                                    a.status === 'EXPIRED' ? 'bg-muted text-muted-foreground border-border' : 'bg-destructive/10 text-destructive-text border-destructive/20'
                                }`}>
                                    {a.status}
                                </div>
                                {a.status === 'INVITED' && a.expiresAt && (
                                    <div className="text-xs font-medium text-muted-foreground mt-2">Expires: {new Date(a.expiresAt).toLocaleDateString()}</div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 text-right">
                                {a.status === 'AWAITING_CONFIRMATION' && (
                                    <button onClick={() => handleConfirm(a.id)} className="text-xs bg-success text-success-foreground px-3 py-1.5 rounded-md hover:bg-success/90 font-medium transition-colors shadow-sm">Confirm Account</button>
                                )}
                                {(a.status === 'INVITED' || a.status === 'EXPIRED') && (
                                    <button onClick={() => handleRenew(a.id)} className="text-xs text-primary font-medium hover:underline">Renew Invite</button>
                                )}
                                {a.status === 'REVOKED' && (
                                    <button onClick={() => handleReactivate(a.id)} className="text-xs text-primary font-medium hover:underline">Reactivate</button>
                                )}
                                {a.status !== 'REVOKED' && (
                                    <button onClick={() => handleRevoke(a.id)} className="text-xs text-destructive-text font-medium hover:underline">Revoke</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
