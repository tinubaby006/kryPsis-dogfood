"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JudgeInvitationAcceptPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAccept = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/judge-invitations/${token}/accept`, {
                method: "POST"
            });
            const data = await res.json();
            
            if (res.status === 401) {
                router.push(`/sign-in?callbackUrl=/judge-invitations/${token}`);
                return;
            }

            if (!res.ok) throw new Error(data.error);

            if (data.access.status === "AWAITING_CONFIRMATION") {
                alert("Invitation accepted! Your access is awaiting final confirmation by the event organizer. You will be notified or you can check your dashboard.");
            } else {
                alert("Invitation accepted! You now have judge access.");
            }
            router.push("/dashboard/judging");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto py-20 px-4">
            <div className="bg-white p-8 rounded-xl border shadow-sm text-center">
                <h1 className="text-2xl font-bold mb-4">Accept Judge Invitation</h1>
                <p className="text-gray-600 mb-6 text-sm">
                    You have been invited to judge an event on our platform. 
                    If you don't have an account with the invited email, you will need to sign up first.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded mb-6 text-sm font-medium border border-red-200 text-left">
                        {error}
                        {error.includes("403") && (
                            <div className="mt-2">
                                <Link href={`/sign-in?callbackUrl=/judge-invitations/${token}`} className="underline">Switch Account</Link>
                            </div>
                        )}
                    </div>
                )}

                <button 
                    onClick={handleAccept}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Accept Invitation"}
                </button>
            </div>
        </div>
    );
}
