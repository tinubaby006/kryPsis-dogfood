import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ProjectEditorClient from "./ProjectEditorClient";

export default async function TeamProjectPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true, customQuestions: true }
    });
    if (!event) return notFound();

    // Find the user's team for this event
    const membership = await prisma.teamMember.findFirst({
        where: { eventId, userId: session.user.id },
        include: { team: true }
    });

    if (!membership) {
        return (
            <div className="p-8 text-center text-destructive-text font-medium bg-destructive/10 border border-destructive/20 rounded-md m-6">
                You must join or create a team for this event before you can submit a project.
            </div>
        );
    }

    // Find the team's project
    const project = await prisma.project.findFirst({
        where: { teamId: membership.teamId },
        include: { assets: true, answers: true }
    });

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 font-heading text-foreground">Submit Your Project</h1>
            <ProjectEditorClient 
                event={event} 
                team={membership.team} 
                initialProject={project} 
            />
        </div>
    );
}
