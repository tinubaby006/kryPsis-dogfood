import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OrganizerDashboard() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    const organizerRoles = await prisma.eventRole.findMany({
        where: { userId: session.user.id, role: "ORGANIZER" },
        include: { event: true }
    });

    const events = organizerRoles.map(r => r.event);

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
                {user?.canCreateEvents && (
                    <Link href="/organizer/events/new" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
                        Create New Event
                    </Link>
                )}
            </div>

            {events.length === 0 ? (
                <div className="bg-gray-50 border rounded-lg p-10 text-center">
                    <p className="text-gray-500 mb-4">You are not organizing any events yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="border rounded-lg bg-white p-6 shadow-sm flex flex-col h-full">
                            <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
                            <p className="text-sm text-gray-500 mb-4">{event.description || "No description"}</p>
                            <div className="mt-auto">
                                <Link href={`/organizer/events/${event.id}`} className="text-blue-600 font-medium hover:underline">
                                    Manage Event &rarr;
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
