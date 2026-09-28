import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { toggleCanCreateEvents } from "@/app/actions/admin";
import { ShieldAlert } from "lucide-react";

export default async function AdminDashboard() {
    const admin = await requirePlatformAdmin();
    const users = await prisma.user.findMany({
        orderBy: { email: 'asc' }
    });

    return (
        <div className="py-6">
            <h1 className="text-3xl font-bold mb-8 font-heading flex items-center gap-2 text-foreground">
                <ShieldAlert className="w-8 h-8 text-primary" /> Platform Administration
            </h1>
            
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Can Create Events</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <form action={async () => {
                                            "use server";
                                            await toggleCanCreateEvents(user.id, !user.canCreateEvents);
                                        }}>
                                            <button 
                                                type="submit"
                                                disabled={user.id === admin.id}
                                                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors border shadow-sm ${
                                                    user.canCreateEvents 
                                                    ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' 
                                                    : 'bg-destructive/10 text-destructive-text border-destructive/20 hover:bg-destructive/20'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {user.canCreateEvents ? 'Revoke Access' : 'Grant Access'}
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
