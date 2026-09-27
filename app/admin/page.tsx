import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { toggleCanCreateEvents } from "@/app/actions/admin";

export default async function AdminDashboard() {
    const admin = await requirePlatformAdmin();
    const users = await prisma.user.findMany({
        orderBy: { email: 'asc' }
    });

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Platform Administration</h1>
            
            <div className="bg-white dark:bg-gray-900 border rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Can Create Events</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isPlatformAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
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
                                            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                                                user.canCreateEvents 
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
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
    );
}
