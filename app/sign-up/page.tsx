"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: callbackUrl
        });

        if (error) {
            setError(error.message || "Failed to sign up");
            setLoading(false);
        } else {
            router.push(callbackUrl);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-card p-8 rounded-xl border border-border shadow-sm">
                <h1 className="text-2xl font-bold mb-6 text-center font-heading text-foreground">Sign Up</h1>
                {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive-text p-3 rounded-md mb-4 text-sm font-medium">{error}</div>}
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Name</label>
                        <input 
                            type="text" 
                            required 
                            className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
                        <input 
                            type="email" 
                            required 
                            className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Password</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full bg-background border border-border text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground p-2.5 rounded-md mt-6 font-medium disabled:opacity-50 hover:bg-primary-hover transition-colors shadow-sm"
                >
                    {loading ? "Signing up..." : "Sign Up"}
                </button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account? <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-primary hover:text-primary-hover font-medium">Sign in</Link>
                </p>
            </form>
        </div>
    );
}
