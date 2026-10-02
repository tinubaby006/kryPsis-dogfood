import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ShieldAlert, Users, Calendar, Inbox, Search, Filter } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    await requirePlatformAdmin();
    
    const params = await searchParams;
    const page = parseInt((params.page as string) || "1");
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    
    const search = (params.search as string) || "";
    const eventId = (params.eventId as string) || "";
    const role = (params.role as string) || "";
    const accountType = (params.accountType as string) || "";

    // Build the query where clause
    const where: any = {};
    
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
        ];
    }
    
    if (accountType === "ADMIN") {
        where.isPlatformAdmin = true;
    } else if (accountType === "USER") {
        where.isPlatformAdmin = false;
    }
    
    // Intersecting event + role filter
    if (eventId && role) {
        where.eventRoles = { some: { eventId, role } };
    } else if (eventId) {
        where.eventRoles = { some: { eventId } };
    } else if (role) {
        where.eventRoles = { some: { role } };
    }

    const [users, totalFilteredUsers, pendingProposalsCount, conductedEventsCount, totalUsersCount, allEvents] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { email: 'asc' },
            skip,
            take: pageSize,
            include: { eventRoles: { include: { event: { select: { name: true } } } } }
        }),
        prisma.user.count({ where }),
        prisma.eventProposal.count({ where: { status: "SUBMITTED" } }),
        prisma.event.count({ where: { visibility: "PUBLIC" } }),
        prisma.user.count(),
        prisma.event.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ]);

    const totalPages = Math.ceil(totalFilteredUsers / pageSize);

    return (
        <div className="py-6 space-y-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold font-heading flex items-center gap-2 text-foreground">
                <ShieldAlert className="w-8 h-8 text-primary" /> Platform Administration
            </h1>
            
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg"><Inbox className="w-6 h-6 text-primary" /></div>
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Proposals</p>
                        <p className="text-2xl font-bold">{pendingProposalsCount}</p>
                    </div>
                    <Link href="/admin/proposals" className="ml-auto text-sm text-primary hover:underline font-medium">Review &rarr;</Link>
                </div>
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="bg-success/20 p-3 rounded-lg"><Calendar className="w-6 h-6 text-success" /></div>
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Public Events</p>
                        <p className="text-2xl font-bold">{conductedEventsCount}</p>
                    </div>
                </div>
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="bg-warning/20 p-3 rounded-lg"><Users className="w-6 h-6 text-warning" /></div>
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
                        <p className="text-2xl font-bold">{totalUsersCount}</p>
                    </div>
                </div>
            </div>

            {/* Users Directory */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="text-xl font-bold font-heading mb-4">User Directory</h2>
                    
                    <form className="flex flex-col md:flex-row gap-4" method="GET" action="/admin">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                            <input 
                                type="text" 
                                name="search" 
                                defaultValue={search} 
                                placeholder="Search users by name or email..." 
                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <select name="eventId" defaultValue={eventId} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-w-[150px]">
                                <option value="">All Events</option>
                                {allEvents.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <select name="role" defaultValue={role} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary">
                                <option value="">All Roles</option>
                                <option value="ORGANIZER">Organizer</option>
                                <option value="JUDGE">Judge</option>
                                <option value="PARTICIPANT">Participant</option>
                            </select>
                            <select name="accountType" defaultValue={accountType} className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary">
                                <option value="">All Account Types</option>
                                <option value="ADMIN">Platform Admin</option>
                                <option value="USER">Standard User</option>
                            </select>
                            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-hover shadow-sm">
                                Filter
                            </button>
                        </div>
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Memberships</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {users.length === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No users found matching your filters.</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-foreground">{user.name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded uppercase tracking-wider border ${
                                                user.isPlatformAdmin 
                                                ? 'bg-primary/20 text-primary border-primary/30' 
                                                : 'bg-muted text-muted-foreground border-border'
                                            }`}>
                                                {user.isPlatformAdmin ? 'Admin' : 'User'}
                                            </span>
                                            {user.emailVerified && <span className="ml-2 text-[10px] text-success font-bold uppercase tracking-wider">Verified</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.eventRoles.slice(0, 3).map(r => (
                                                    <span key={r.id} className="px-2 py-0.5 text-xs bg-muted border border-border rounded text-muted-foreground">
                                                        {r.event.name}: <strong>{r.role}</strong>
                                                    </span>
                                                ))}
                                                {user.eventRoles.length > 3 && (
                                                    <span className="px-2 py-0.5 text-xs bg-muted/50 border border-border border-dashed rounded text-muted-foreground">
                                                        +{user.eventRoles.length - 3} more
                                                    </span>
                                                )}
                                                {user.eventRoles.length === 0 && (
                                                    <span className="text-xs text-muted-foreground italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
                        <span className="text-sm text-muted-foreground">Showing page {page} of {totalPages} ({totalFilteredUsers} total users)</span>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Link 
                                    href={`/admin?page=${page - 1}&search=${encodeURIComponent(search)}&eventId=${encodeURIComponent(eventId)}&role=${encodeURIComponent(role)}&accountType=${encodeURIComponent(accountType)}`} 
                                    className="px-3 py-1.5 text-sm bg-background border border-border rounded-md hover:bg-muted font-medium"
                                >
                                    Previous
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link 
                                    href={`/admin?page=${page + 1}&search=${encodeURIComponent(search)}&eventId=${encodeURIComponent(eventId)}&role=${encodeURIComponent(role)}&accountType=${encodeURIComponent(accountType)}`} 
                                    className="px-3 py-1.5 text-sm bg-background border border-border rounded-md hover:bg-muted font-medium"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
