import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user?.canCreateEvents) {
        return (
            <div className="py-6">
                <div className="bg-destructive/10 text-destructive-text p-6 rounded-xl border border-destructive/20 shadow-sm">
                    <h2 className="text-xl font-bold mb-2 font-heading">Access Denied</h2>
                    <p>You do not have permission to create new events. Please contact a platform administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-10 px-4 md:px-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 font-heading text-foreground">Create New Event</h1>
            <NewEventForm />
        </div>
    );
}
