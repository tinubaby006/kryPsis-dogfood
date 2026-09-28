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

    return (
        <div className="bg-white p-6 rounded border shadow-sm mt-6">
            <h2 className="text-xl font-bold mb-4">Judges</h2>
            
            {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm mb-4">{error}</div>}

            <form onSubmit={handleGrant} className="mb-6 bg-gray-50 p-4 rounded border">
                <h3 className="font-semibold mb-2 text-sm">Provision Judge Access</h3>
                <div className="space-y-3">
                    <div>
                        <input 
                            type="email" 
                            required 
                            className="w-full p-2 border rounded" 
                            placeholder="Judge email address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 mb-1">Select tracks for this judge (required):</p>
                        <div className="flex flex-wrap gap-2">
                            {tracks.map(t => (
                                <label key={t.id} className="inline-flex items-center text-sm bg-white border px-2 py-1 rounded cursor-pointer">
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
                    <button 
                        type="submit" 
                        disabled={submitting || selectedTracks.length === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? "Processing..." : "Grant / Create Invite"}
                    </button>
                </div>
            </form>

            {loading ? (
                <div className="text-sm text-gray-500">Loading judges...</div>
            ) : accesses.length === 0 ? (
                <div className="text-sm text-gray-500">No judges provisioned yet.</div>
            ) : (
                <ul className="space-y-3">
                    {accesses.map(a => (
                        <li key={a.id} className="border rounded p-3 text-sm flex justify-between items-start">
                            <div>
                                <div className="font-semibold">{a.user?.name || a.emailNormalized}</div>
                                <div className="text-gray-500 text-xs mb-1">{a.emailNormalized}</div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {a.tracks.map((t: any) => (
                                        <span key={t.id} className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded">
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                                <div className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${
                                    a.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    a.status === 'INVITED' ? 'bg-yellow-100 text-yellow-800' :
                                    a.status === 'AWAITING_CONFIRMATION' ? 'bg-purple-100 text-purple-800' :
                                    a.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {a.status}
                                </div>
                                {a.status === 'INVITED' && a.expiresAt && (
                                    <div className="text-xs text-gray-500 mt-1">Expires: {new Date(a.expiresAt).toLocaleDateString()}</div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 text-right">
                                {a.status === 'AWAITING_CONFIRMATION' && (
                                    <button onClick={() => handleConfirm(a.id)} className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">Confirm Account</button>
                                )}
                                {(a.status === 'INVITED' || a.status === 'EXPIRED') && (
                                    <button onClick={() => handleRenew(a.id)} className="text-xs text-blue-600 hover:underline">Renew Invite</button>
                                )}
                                {a.status !== 'REVOKED' && (
                                    <button onClick={() => handleRevoke(a.id)} className="text-xs text-red-600 hover:underline">Revoke</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
