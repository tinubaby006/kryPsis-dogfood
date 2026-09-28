"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Organizer Requests</h1>
                <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 mb-4 rounded">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading queue...</div>
                        ) : requests.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No requests found.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4 font-semibold">Applicant</th>
                                        <th className="p-4 font-semibold">Event</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => (
                                        <tr 
                                            key={req.id} 
                                            onClick={() => setSelectedReq(req)}
                                            className={`border-b cursor-pointer hover:bg-gray-50 ${selectedReq?.id === req.id ? 'bg-blue-50' : ''}`}
                                        >
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{req.applicant.name}</div>
                                                <div className="text-gray-500">{req.applicant.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900 line-clamp-1">{req.proposedEventName}</div>
                                                <div className="text-gray-500 line-clamp-1">{req.organizationName || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                    req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="md:col-span-1">
                    {selectedReq ? (
                        <div className="bg-white border rounded-lg shadow-sm p-6 sticky top-6">
                            <h2 className="text-xl font-bold mb-4">Request Details</h2>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500">Applicant</h3>
                                    <p className="font-medium">{selectedReq.applicant.name}</p>
                                    <p className="text-sm text-gray-600">{selectedReq.applicant.email}</p>
                                    <p className="text-xs mt-1">
                                        Current Permission: <span className={selectedReq.applicant.canCreateEvents ? 'text-green-600 font-semibold' : 'text-gray-500'}>{selectedReq.applicant.canCreateEvents ? 'Yes' : 'No'}</span>
                                    </p>
                                    {selectedReq.applicant.canCreateEvents && (
                                        <button onClick={() => handleRevoke(selectedReq.applicantUserId)} className="text-xs text-red-600 hover:underline mt-1">
                                            Revoke Capability
                                        </button>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500">Proposed Event</h3>
                                    <p className="font-medium">{selectedReq.proposedEventName}</p>
                                </div>

                                {selectedReq.organizationName && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500">Organization</h3>
                                        <p className="font-medium">{selectedReq.organizationName}</p>
                                    </div>
                                )}

                                {selectedReq.websiteUrl && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500">Website</h3>
                                        <a href={selectedReq.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all">{selectedReq.websiteUrl}</a>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500">Reason</h3>
                                    <p className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap max-h-60 overflow-y-auto">{selectedReq.reason}</p>
                                </div>

                                {selectedReq.status !== "PENDING" && selectedReq.decisionReason && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500">Decision Reason</h3>
                                        <p className="text-sm bg-gray-50 p-3 rounded border text-gray-700 whitespace-pre-wrap">{selectedReq.decisionReason}</p>
                                    </div>
                                )}
                            </div>

                            {selectedReq.status === "PENDING" && (
                                <div className="border-t pt-4">
                                    <label className="block text-sm font-semibold mb-2">Decision Reason (Required for Rejection)</label>
                                    <textarea 
                                        className="w-full border rounded p-2 text-sm mb-4" 
                                        rows={3} 
                                        placeholder="Add a reason or note..."
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleDecision("REJECT")}
                                            className="flex-1 bg-white border border-red-200 text-red-700 py-2 rounded font-medium hover:bg-red-50 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleDecision("APPROVE")}
                                            className="flex-1 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border rounded-lg border-dashed flex items-center justify-center h-64 text-gray-500">
                            Select a request to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
