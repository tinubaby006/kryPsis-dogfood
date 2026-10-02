import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage() {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    return (
        <div className="py-10 px-4 md:px-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 font-heading text-foreground">Create New Event</h1>
            <NewEventForm />
        </div>
    );
}
