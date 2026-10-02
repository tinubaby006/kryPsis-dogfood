import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { JudgesSectionFull } from "./JudgesSectionFull";

export default async function FullJudgesPage({ params }: { params: Promise<{ eventId: string }> }) {
    const session = await getSession();
    if (!session?.user) redirect("/sign-in");

    const { eventId } = await params;
    
    const isOrg = await prisma.eventRole.findUnique({
        where: { eventId_userId: { eventId, userId: session.user.id } }
    });

    if (!isOrg || isOrg.role !== "ORGANIZER") {
        return <div className="p-10 text-destructive-text font-medium bg-destructive/10 border border-destructive/20 rounded-md">Access Denied. You are not an organizer for this event.</div>;
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true }
    });

    if (!event) notFound();

    return (
        <div className="py-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
                    <Users className="w-8 h-8 text-primary" /> {event.name} Judges
                </h1>
                <Link href={`/organizer/events/${eventId}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>

            <JudgesSectionFull eventId={event.id} tracks={event.tracks} tracksMode={event.tracksMode} />
        </div>
    );
}
