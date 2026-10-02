"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Menu, X, LayoutDashboard, Shield, Calendar, Users, FileText, CheckSquare, Settings, LogOut, Gavel, ChevronDown } from "lucide-react";

export default function WorkspaceLayoutClient({
    children,
    user,
    isAdmin,
    events
}: {
    children: React.ReactNode;
    user: any;
    isAdmin: boolean;
    events: any[];
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    // Determine current section Context and active event
    let currentEventId: string | null = null;
    let section = "dashboard";

    if (pathname.startsWith("/admin")) {
        section = "admin";
    } else if (pathname.startsWith("/organizer/events/")) {
        const match = pathname.match(/^\/organizer\/events\/([^\/]+)/);
        if (match) currentEventId = match[1];
        section = "organizer";
    } else if (pathname.match(/^\/events\/([^\/]+)\/judge/)) {
        const match = pathname.match(/^\/events\/([^\/]+)\/judge/);
        if (match) currentEventId = match[1];
        section = "judge";
    } else if (pathname.match(/^\/events\/([^\/]+)\/participant/)) {
        const match = pathname.match(/^\/events\/([^\/]+)\/participant/);
        if (match) currentEventId = match[1];
        section = "participant";
    } else if (pathname.match(/^\/events\/([^\/]+)/)) {
        const match = pathname.match(/^\/events\/([^\/]+)/);
        if (match) currentEventId = match[1];
    }

    const activeEvent = currentEventId ? events.find(e => e.id === currentEventId || e.slug === currentEventId) : null;

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
        <div className="flex flex-col h-full bg-sidebar border-r border-border relative">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <Link href="/" className="font-bold text-xl tracking-tight text-primary">DogfoodHack</Link>
            </div>

            {/* Event Switcher */}
            <div className="p-4 border-b border-border relative">
                <button 
                    onClick={() => setSwitcherOpen(!switcherOpen)}
                    className="w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    <span className="truncate">{activeEvent ? activeEvent.name : "My Dashboard"}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                </button>
                {switcherOpen && (
                    <div className="absolute top-[3.5rem] left-4 right-4 bg-popover border border-border rounded-md shadow-lg z-50 py-1 overflow-hidden">
                        <Link 
                            href="/dashboard" 
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setSwitcherOpen(false)}
                        >
                            My Dashboard (Global)
                        </Link>
                        {events.length > 0 && <div className="border-t border-border my-1"></div>}
                        {events.map(e => (
                            <Link 
                                key={e.id}
                                href={`/events/${e.slug}`}
                                className="block px-4 py-2 text-sm text-foreground hover:bg-muted truncate"
                                onClick={() => setSwitcherOpen(false)}
                            >
                                {e.name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
                {/* Global Workspace */}
                {!activeEvent && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Workspace</p>
                        <div className="space-y-1">
                            <NavLink href="/dashboard" icon={LayoutDashboard} label="My Activity" exact />
                        </div>
                    </div>
                )}

                {/* Event Contextual Workspace */}
                {activeEvent && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 truncate" title={activeEvent.name}>
                            {activeEvent.name}
                        </p>
                        <div className="space-y-1">
                            <NavLink href={`/events/${activeEvent.slug}`} icon={Calendar} label="Event Portal" exact />
                            
                            {activeEvent.roles.includes("ORGANIZER") && (
                                <NavLink href={`/organizer/events/${activeEvent.slug}`} icon={Shield} label="Organizer Settings" />
                            )}
                            
                            {activeEvent.roles.includes("JUDGE") && (
                                <NavLink href={`/events/${activeEvent.slug}/judge`} icon={Gavel} label="Judge Workbench" />
                            )}
                            
                            {activeEvent.roles.includes("PARTICIPANT") && (
                                <NavLink href={`/events/${activeEvent.slug}/participant`} icon={Users} label="Participant Hub" />
                            )}
                        </div>
                    </div>
                )}

                {/* Admin Section */}
                {isAdmin && !activeEvent && (
                    <div className="px-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Administration</p>
                        <div className="space-y-1">
                            <NavLink href="/admin" icon={Shield} label="Admin Overview" exact />
                            <NavLink href="/admin/organizer-requests" icon={CheckSquare} label="Organizer Requests" />
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
            <div className="hidden md:block w-[240px] shrink-0 h-full">
                <SidebarContent />
            </div>

            {drawerOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/80 md:hidden" 
                    onClick={() => setDrawerOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <SidebarContent />
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="md:hidden h-16 shrink-0 flex items-center px-4 border-b border-border bg-card">
                    <button 
                        onClick={() => setDrawerOpen(true)}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-bold text-primary">DogfoodHack</span>
                </header>

                <header className="hidden md:flex h-16 shrink-0 items-center px-8 border-b border-border bg-background">
                    <h1 className="text-lg font-semibold text-foreground capitalize">
                        {activeEvent ? (
                            <span className="flex items-center gap-2">
                                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                                <span className="text-muted-foreground">/</span>
                                <span>{activeEvent.name}</span>
                                {section !== 'dashboard' && (
                                    <>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-primary">{section}</span>
                                    </>
                                )}
                            </span>
                        ) : (
                            section === "admin" ? "Administration" : "Dashboard"
                        )}
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
