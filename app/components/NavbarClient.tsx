"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SignOutButton } from "./SignOutButton";

export default function NavbarClient({ 
    user, 
    isAdmin, 
    organizerEventIds 
}: { 
    user: any, 
    isAdmin: boolean, 
    organizerEventIds: string[] 
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const eventIdMatch = pathname?.match(/^\/(?:events|organizer\/events)\/([^\/]+)/);
    const currentEventId = eventIdMatch ? eventIdMatch[1] : null;

    let displayRole = "";
    let showOrganizerLink = false;

    if (pathname?.startsWith("/admin") || pathname?.startsWith("/organizer") || pathname?.startsWith("/dashboard")) {
        return null;
    }

    if (isAdmin) {
        displayRole = "Admin";
        showOrganizerLink = true;
    } else if (currentEventId) {
        if (organizerEventIds.includes(currentEventId)) {
            displayRole = "Organizer";
            showOrganizerLink = true;
        }
    } else if (organizerEventIds.length > 0) {
        showOrganizerLink = true;
    }



    return (
        <header className="bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="font-bold text-xl tracking-tight text-primary">DogfoodHack</Link>
                        
                        {/* Desktop Nav */}
                        <nav className="hidden md:flex space-x-4">
                            {isAdmin && <Link href="/admin" className="text-muted-foreground hover:text-foreground font-medium transition-colors">Admin</Link>}
                        </nav>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="hidden md:flex items-center space-x-4">
                                {displayRole && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded font-bold uppercase">{displayRole}</span>}
                                <Link href="/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
                                <SignOutButton className="text-sm text-destructive-text hover:text-destructive transition-colors font-medium" icon={false}>Sign Out</SignOutButton>
                            </div>
                        ) : (
                            <Link href="/sign-in" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary-hover transition-colors">Sign In</Link>
                        )}
                        
                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="text-muted-foreground hover:text-foreground p-2">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Nav */}
            {menuOpen && (
                <div className="md:hidden border-t border-border bg-card">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {isAdmin && <Link href="/admin" className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">Admin</Link>}
                        {user ? (
                            <>
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    {displayRole && <span className="inline-block bg-primary/20 text-primary text-xs px-2 py-1 rounded font-bold uppercase mr-2">{displayRole}</span>}
                                    {user.email}
                                </div>
                                <Link href="/dashboard" className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">Dashboard</Link>
                                <SignOutButton className="block w-full text-left px-3 py-2 text-base font-medium text-destructive-text hover:bg-muted rounded-md" icon={false}>Sign Out</SignOutButton>
                            </>
                        ) : (
                            <Link href="/sign-in" className="block px-3 py-2 text-base font-medium text-primary hover:bg-muted rounded-md">Sign In</Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
