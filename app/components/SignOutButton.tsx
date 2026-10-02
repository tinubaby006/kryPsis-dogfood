"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

export function SignOutButton({ 
    className = "", 
    children, 
    icon = true 
}: { 
    className?: string, 
    children?: React.ReactNode, 
    icon?: boolean 
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignOut = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error: signOutError } = await authClient.signOut();
            if (signOutError) {
                setError(signOutError.message || "Failed to sign out");
                setLoading(false);
            } else {
                router.push("/sign-in");
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || "Failed to sign out");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col w-full">
            <button 
                onClick={handleSignOut}
                disabled={loading}
                className={className || "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-destructive-text hover:bg-destructive/10 transition-colors"}
            >
                {icon && <LogOut className="w-4 h-4" />}
                {children || (loading ? "Signing out..." : "Sign Out")}
            </button>
            {error && <span className="text-xs text-destructive-text mt-1 px-4">{error}</span>}
        </div>
    );
}
