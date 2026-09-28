"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserCheck, Search, XCircle, CheckCircle } from "lucide-react";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "REVOKED";

interface OrganizerRequest {
    id: string;
    applicantUserId: string;
    applicant: { name: string; email: string; canCreateEvents: boolean };
    organizationName: string | null;
    proposedEventName: string;
    reason: string;
    websiteUrl: string | null;
    status: RequestStatus;
    decisionReason: string | null;
    createdAt: string;
    version: number;
}

export default function AdminOrganizerRequestsPage() {
    const [requests, setRequests] = useState<OrganizerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedReq, setSelectedReq] = useState<OrganizerRequest | null>(null);
    const [reason, setReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/organizer-access-requests");
            if (!res.ok) throw new Error("Failed to load requests");
            const data = await res.json();
            setRequests(data.requests);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (decision: "APPROVE" | "REJECT") => {
        if (!selectedReq) return;
        if (decision === "REJECT" && !reason) {
            alert("A reason is required to reject.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch(`/api/admin/organizer-access-requests/${selectedReq.id}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision,
                    reason,
                    expectedVersion: selectedReq.version
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Decision failed");
            
            setSelectedReq(null);
            setReason("");
            await fetchRequests();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevoke = async (userId: string) => {
        const revokeReason = prompt("Enter reason for revoking organizer capability for this user:");
        if (!revokeReason) return;
        
        try {
            const res = await fetch(`/api/admin/users/${userId}/organizer-capability/revoke`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: revokeReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert("Capability revoked.");
            await fetchRequests();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-heading flex items-center gap-2 text-foreground">
                    <UserCheck className="w-8 h-8 text-primary" /> Organizer Requests
                </h1>
                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin
                </Link>
            </div>

            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-4 mb-6 rounded-md font-medium text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                <Search className="w-8 h-8 mb-4 opacity-20" />
                                <p>Loading queue...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                <ShieldCheck className="w-12 h-12 mb-4 text-muted-foreground/30" />
                                <p>No requests found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="p-4 font-semibold text-muted-foreground">Applicant</th>
                                            <th className="p-4 font-semibold text-muted-foreground">Event</th>
                                            <th className="p-4 font-semibold text-muted-foreground">Status</th>
                                            <th className="p-4 font-semibold text-muted-foreground">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {requests.map(req => (
                                            <tr 
                                                key={req.id} 
                                                onClick={() => setSelectedReq(req)}
                                                className={`cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30 border-l-2 border-l-transparent'}`}
                                            >
                                                <td className="p-4">
                                                    <div className="font-semibold text-foreground">{req.applicant.name}</div>
                                                    <div className="text-muted-foreground text-xs mt-0.5">{req.applicant.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-foreground line-clamp-1">{req.proposedEventName}</div>
                                                    <div className="text-muted-foreground text-xs line-clamp-1 mt-0.5">{req.organizationName || '-'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                                                        req.status === 'PENDING' ? 'bg-warning/10 text-warning border-warning/20' :
                                                        req.status === 'APPROVED' ? 'bg-success/10 text-success border-success/20' :
                                                        req.status === 'REJECTED' ? 'bg-destructive/10 text-destructive-text border-destructive/20' : 'bg-muted text-muted-foreground border-border'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-muted-foreground text-xs font-medium">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    {selectedReq ? (
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6 lg:sticky lg:top-6">
                            <h2 className="text-xl font-bold mb-6 font-heading border-b border-border pb-3 flex items-center justify-between">
                                Request Details
                                <button onClick={() => setSelectedReq(null)} className="text-muted-foreground hover:text-foreground">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </h2>
                            
                            <div className="space-y-5 mb-8">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Applicant</h3>
                                    <p className="font-semibold text-foreground">{selectedReq.applicant.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedReq.applicant.email}</p>
                                    <p className="text-xs mt-2 font-medium">
                                        Current Permission: <span className={selectedReq.applicant.canCreateEvents ? 'text-success font-bold bg-success/10 px-1.5 py-0.5 rounded ml-1' : 'text-muted-foreground'}>{selectedReq.applicant.canCreateEvents ? 'Yes' : 'No'}</span>
                                    </p>
                                    {selectedReq.applicant.canCreateEvents && (
                                        <button onClick={() => handleRevoke(selectedReq.applicantUserId)} className="text-xs text-destructive-text hover:underline mt-2 font-medium">
                                            Revoke Capability
                                        </button>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Proposed Event</h3>
                                    <p className="font-semibold text-foreground">{selectedReq.proposedEventName}</p>
                                </div>

                                {selectedReq.organizationName && (
                                    <div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Organization</h3>
                                        <p className="font-semibold text-foreground">{selectedReq.organizationName}</p>
                                    </div>
                                )}

                                {selectedReq.websiteUrl && (
                                    <div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Website</h3>
                                        <a href={selectedReq.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover text-sm break-all font-medium">{selectedReq.websiteUrl}</a>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Reason</h3>
                                    <p className="text-sm bg-muted/50 p-4 rounded-md border border-border whitespace-pre-wrap text-foreground/90 max-h-60 overflow-y-auto leading-relaxed">{selectedReq.reason}</p>
                                </div>

                                {selectedReq.status !== "PENDING" && selectedReq.decisionReason && (
                                    <div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Decision Reason</h3>
                                        <p className="text-sm bg-muted p-4 rounded-md border border-border text-foreground/90 whitespace-pre-wrap leading-relaxed">{selectedReq.decisionReason}</p>
                                    </div>
                                )}
                            </div>

                            {selectedReq.status === "PENDING" && (
                                <div className="border-t border-border pt-6 mt-6">
                                    <label className="block text-sm font-semibold mb-2 text-foreground">Decision Reason (Required for Rejection)</label>
                                    <textarea 
                                        className="w-full bg-background border border-border text-foreground rounded-md p-3 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" 
                                        rows={3} 
                                        placeholder="Add a reason or note..."
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleDecision("REJECT")}
                                            className="flex-1 bg-background border border-destructive/50 text-destructive-text py-2.5 rounded-md font-medium hover:bg-destructive/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleDecision("APPROVE")}
                                            className="flex-1 bg-success text-success-foreground py-2.5 rounded-md font-medium hover:bg-success/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-card border border-border border-dashed rounded-xl flex items-center justify-center h-64 text-muted-foreground">
                            <div className="text-center">
                                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p>Select a request to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
