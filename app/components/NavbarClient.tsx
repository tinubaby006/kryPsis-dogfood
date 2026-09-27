"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

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

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="font-bold text-xl tracking-tight text-blue-600">DogfoodHack</Link>
                        
                        {/* Desktop Nav */}
                        <nav className="hidden md:flex space-x-4">
                            {isAdmin && <Link href="/admin" className="text-gray-600 hover:text-gray-900 font-medium">Admin</Link>}
                            {showOrganizerLink && <Link href="/organizer" className="text-gray-600 hover:text-gray-900 font-medium">Organizer</Link>}
                        </nav>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="hidden md:flex items-center space-x-4">
                                {displayRole && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase">{displayRole}</span>}
                                <span className="text-sm font-medium text-gray-700">{user.email}</span>
                                <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-800 font-medium">Sign Out</button>
                            </div>
                        ) : (
                            <Link href="/sign-in" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">Sign In</Link>
                        )}
                        
                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-500 hover:text-gray-900 p-2">
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
                <div className="md:hidden border-t">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {isAdmin && <Link href="/admin" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Admin</Link>}
                        {showOrganizerLink && <Link href="/organizer" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Organizer</Link>}
                        {user ? (
                            <>
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    {displayRole && <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase mr-2">{displayRole}</span>}
                                    {user.email}
                                </div>
                                <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-gray-50">Sign Out</button>
                            </>
                        ) : (
                            <Link href="/sign-in" className="block px-3 py-2 text-base font-medium text-blue-600 hover:bg-gray-50">Sign In</Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
