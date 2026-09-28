"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Menu, X, LayoutDashboard, Shield, Calendar, Users, FileText, CheckSquare, Settings, LogOut, Gavel } from "lucide-react";

export default function WorkspaceLayoutClient({
    children,
    user,
    isAdmin,
    organizerEventIds,
    judgingEventIds
}: {
    children: React.ReactNode;
    user: any;
    isAdmin: boolean;
    organizerEventIds: string[];
    judgingEventIds: string[];
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    // Determine current section Context
    let currentEventId: string | null = null;
    let section = "dashboard";

    if (pathname.startsWith("/admin")) section = "admin";
    else if (pathname.startsWith("/organizer")) section = "organizer";
    else if (pathname.startsWith("/dashboard/judging")) section = "judge";
    else if (pathname.startsWith("/events/")) {
        const match = pathname.match(/^\/events\/([^\/]+)/);
        if (match) currentEventId = match[1];
        section = "participant";
    }

    const NavLink = ({ href, icon: Icon, label, exact = false }: { href: string, icon: any, label: string, exact?: boolean }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
            <Link 
                href={href} 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setDrawerOpen(false)}
            >
                <Icon className="w-4 h-4" />
                {label}
            </Link>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-sidebar border-r border-border">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <Link href="/" className="font-bold text-xl tracking-tight text-primary">DogfoodHack</Link>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
                {/* User Section */}
                <div className="px-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Workspace</p>
                    <div className="space-y-1">
                        <NavLink href="/dashboard" icon={LayoutDashboard} label="My Dashboard" exact />
                    </div>
                </div>

                {/* Admin Section */}
                {isAdmin && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Administration</p>
                        <div className="space-y-1">
                            <NavLink href="/admin" icon={Shield} label="Admin Overview" exact />
                            <NavLink href="/admin/organizer-requests" icon={CheckSquare} label="Organizer Requests" />
                        </div>
                    </div>
                )}

                {/* Organizer Section */}
                {organizerEventIds.length > 0 && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Organizer</p>
                        <div className="space-y-1">
                            <NavLink href="/organizer" icon={Calendar} label="My Events" exact />
                        </div>
                    </div>
                )}

                {/* Judge Section */}
                {judgingEventIds.length > 0 && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Judging</p>
                        <div className="space-y-1">
                            <NavLink href="/dashboard/judging" icon={Gavel} label="Judge Workspace" />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Profile */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>
                <button 
                    onClick={handleSignOut}
                    className="mt-2 flex w-full items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-destructive-text hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block w-[240px] shrink-0 h-full">
                <SidebarContent />
            </div>

            {/* Mobile Drawer Overlay */}
            {drawerOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/80 md:hidden" 
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <SidebarContent />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden h-16 shrink-0 flex items-center px-4 border-b border-border bg-card">
                    <button 
                        onClick={() => setDrawerOpen(true)}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-bold text-primary">DogfoodHack</span>
                </header>

                {/* Desktop Topbar (Optional, can be used for breadcrumbs or actions) */}
                <header className="hidden md:flex h-16 shrink-0 items-center px-8 border-b border-border bg-background">
                    <h1 className="text-lg font-semibold text-foreground capitalize">
                        {section === "judge" ? "Judging" : section}
                    </h1>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-[1280px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
