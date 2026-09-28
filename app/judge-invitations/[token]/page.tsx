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
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <div className="bg-card p-10 rounded-xl border border-border shadow-sm text-center max-w-md w-full">
                <h1 className="text-2xl font-bold mb-4 font-heading text-foreground">Accept Judge Invitation</h1>
                <p className="text-muted-foreground mb-8 text-sm">
                    You have been invited to judge an event on our platform. 
                    If you don't have an account with the invited email, you will need to sign up first.
                </p>

                {error && (
                    <div className="bg-destructive/10 text-destructive-text p-4 rounded-md mb-8 text-sm font-medium border border-destructive/20 text-left">
                        {error}
                        {error.includes("403") && (
                            <div className="mt-3">
                                <Link href={`/sign-in?callbackUrl=/judge-invitations/${token}`} className="underline hover:text-destructive-text/80 transition-colors">Switch Account</Link>
                            </div>
                        )}
                    </div>
                )}

                <button 
                    onClick={handleAccept}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm"
                >
                    {loading ? "Processing..." : "Accept Invitation"}
                </button>
            </div>
        </div>
    );
}
