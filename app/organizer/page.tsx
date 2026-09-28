import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, ArrowRight } from "lucide-react";

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
        <div className="py-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-heading flex items-center gap-2 text-foreground">
                    <CalendarDays className="w-8 h-8 text-primary" /> Organizer Dashboard
                </h1>
                {user?.canCreateEvents && (
                    <Link href="/organizer/events/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Create New Event
                    </Link>
                )}
            </div>

            {events.length === 0 ? (
                <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center shadow-sm">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold font-heading mb-2 text-foreground">No Events Found</h3>
                    <p className="text-muted-foreground mb-6">You are not organizing any events yet.</p>
                    {user?.canCreateEvents && (
                        <Link href="/organizer/events/new" className="text-primary hover:text-primary-hover font-medium">
                            Create your first event
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="border border-border rounded-xl bg-card p-6 shadow-sm flex flex-col h-full hover:border-primary/50 transition-colors group">
                            <h2 className="text-xl font-bold mb-2 font-heading group-hover:text-primary transition-colors text-foreground">{event.name}</h2>
                            <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-3">{event.description || "No description provided."}</p>
                            <div className="mt-auto border-t border-border pt-4">
                                <Link href={`/organizer/events/${event.id}`} className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium text-sm">
                                    Manage Event <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
