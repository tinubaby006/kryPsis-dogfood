"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "REVOKED";

interface OrganizerRequest {
    id: string;
    organizationName: string | null;
    proposedEventName: string;
    reason: string;
    websiteUrl: string | null;
    status: RequestStatus;
    decisionReason: string | null;
    createdAt: string;
}

export default function OrganizerAccessPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<OrganizerRequest[]>([]);
    const [canCreateEvents, setCanCreateEvents] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [orgName, setOrgName] = useState("");
    const [eventName, setEventName] = useState("");
    const [reason, setReason] = useState("");
    const [website, setWebsite] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/organizer-access-requests/me");
            if (res.status === 401) {
                router.push("/sign-in?callbackUrl=/organizer-access");
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch status");
            const data = await res.json();
            setRequests(data.requests);
            setCanCreateEvents(data.canCreateEvents);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/organizer-access-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationName: orgName,
                    proposedEventName: eventName,
                    reason,
                    websiteUrl: website
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit request");
            
            // Reset form and refetch
            setOrgName("");
            setEventName("");
            setReason("");
            setWebsite("");
            await fetchStatus();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async (id: string) => {
        if (!confirm("Are you sure you want to withdraw this application?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/organizer-access-requests/${id}/withdraw`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            await fetchStatus();
        } catch (e: any) {
            alert(e.message);
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading...</div>;
    }

    const pendingRequest = requests.find(r => r.status === "PENDING");
    const activeRequest = requests[0]; // Most recent

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-6">Organizer Access Application</h1>
            
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 font-medium">
                    {error}
                </div>
            )}

            {canCreateEvents ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-green-800 mb-2">You are an Organizer!</h2>
                    <p className="text-green-700 mb-6">Your account has been approved to create and manage events.</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/organizer" className="px-6 py-2 bg-white text-green-700 border border-green-300 rounded font-semibold hover:bg-green-50">Manage Events</Link>
                        <Link href="/organizer/events/new" className="px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700">Create Event</Link>
                    </div>
                </div>
            ) : pendingRequest ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-blue-900 mb-2">Application Pending</h2>
                    <p className="text-blue-800 mb-4">You submitted an application on {new Date(pendingRequest.createdAt).toLocaleString()}. An admin will review it shortly.</p>
                    
                    <div className="bg-white p-4 rounded border border-blue-100 mb-6">
                        <h3 className="font-semibold text-gray-700 text-sm">Proposed Event</h3>
                        <p className="mb-2 text-gray-900">{pendingRequest.proposedEventName}</p>
                        
                        <h3 className="font-semibold text-gray-700 text-sm">Reason / Description</h3>
                        <p className="text-gray-900 whitespace-pre-wrap text-sm">{pendingRequest.reason}</p>
                    </div>

                    <button 
                        onClick={() => handleWithdraw(pendingRequest.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                    >
                        Withdraw Application
                    </button>
                </div>
            ) : (
                <div className="bg-white border rounded-xl shadow-sm p-6">
                    {activeRequest && activeRequest.status === "REJECTED" && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                            <h3 className="font-bold text-red-800 mb-1">Previous Application Rejected</h3>
                            <p className="text-red-700 text-sm mb-2"><strong>Reason:</strong> {activeRequest.decisionReason || "No reason provided."}</p>
                            <p className="text-red-700 text-sm">You may update your information and reapply below.</p>
                        </div>
                    )}
                    
                    {activeRequest && activeRequest.status === "REVOKED" && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                            <h3 className="font-bold text-red-800 mb-1">Organizer Access Revoked</h3>
                            <p className="text-red-700 text-sm mb-2"><strong>Reason:</strong> {activeRequest.decisionReason || "No reason provided."}</p>
                            <p className="text-red-700 text-sm">You may reapply below.</p>
                        </div>
                    )}

                    <h2 className="text-lg font-bold mb-4">Submit a New Request</h2>
                    <p className="text-gray-600 text-sm mb-6">To maintain platform quality, we require event organizers to be approved. Please provide details about your community and the event you'd like to host.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Organization / Community Name (Optional)</label>
                            <input 
                                type="text" 
                                maxLength={160}
                                className="w-full p-2 border rounded-md"
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Proposed Event Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                required
                                maxLength={160}
                                className="w-full p-2 border rounded-md"
                                value={eventName}
                                onChange={e => setEventName(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Website URL (Optional)</label>
                            <input 
                                type="url" 
                                className="w-full p-2 border rounded-md"
                                value={website}
                                onChange={e => setWebsite(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-1">Event Description & Reason for Access <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500 mb-1">Please write between 50 and 1500 characters.</p>
                            <textarea 
                                required
                                minLength={50}
                                maxLength={1500}
                                rows={5}
                                className="w-full p-2 border rounded-md"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                            <div className="text-right text-xs text-gray-500">{reason.length}/1500</div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-md hover:bg-gray-800 disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit Application"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
