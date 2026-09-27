"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function SignInPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await authClient.signIn.email({
            email,
            password,
            callbackURL: callbackUrl
        });

        if (error) {
            setError(error.message || "Failed to sign in");
            setLoading(false);
        } else {
            router.push(callbackUrl);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded border shadow">
                <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
                {error && <div className="bg-red-50 text-red-800 p-3 rounded mb-4 text-sm">{error}</div>}
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input 
                            type="email" 
                            required 
                            className="w-full border p-2 rounded" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full border p-2 rounded" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white p-2 rounded mt-6 font-medium disabled:opacity-50"
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account? <Link href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-blue-600 hover:underline">Sign up</Link>
                </p>
            </form>
        </div>
    );
}
