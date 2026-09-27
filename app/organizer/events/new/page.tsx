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
            <div className="container mx-auto py-10 px-4 max-w-2xl">
                <div className="bg-red-50 text-red-800 p-6 rounded-lg border border-red-200">
                    <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                    <p>You do not have permission to create new events. Please contact a platform administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
            <NewEventForm />
        </div>
    );
}
