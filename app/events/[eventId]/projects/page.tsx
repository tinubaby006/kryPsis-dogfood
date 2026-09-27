import { prisma } from "@/lib/db";
import { toPublicProjectDTO } from "@/lib/dtos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import ProjectGalleryClient from "./ProjectGalleryClient";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PublicProjectsGallery({ 
    params,
    searchParams 
}: { 
    params: Promise<{ eventId: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { eventId } = await params;
    const { q, trackId, tag, page } = await searchParams;
    
    const session = await getSession();
    let isOrganizer = false;
    
    if (session?.user) {
        const orgRole = await prisma.eventRole.findUnique({
            where: { eventId_userId_role: { eventId, userId: session.user.id, role: "ORGANIZER" } }
        });
        isOrganizer = !!orgRole;
        if (!isOrganizer) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id }});
            isOrganizer = !!user?.isPlatformAdmin;
        }
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { tracks: true }
    });
    if (!event) return notFound();

    const currentPage = Math.max(1, parseInt((page as string) || "1", 10));
    const pageSize = 12;

    const where: Prisma.ProjectWhereInput = {
        eventId,
        status: "SUBMITTED"
    };

    if (q) {
        where.OR = [
            { title: { contains: q as string, mode: "insensitive" } },
            { summary: { contains: q as string, mode: "insensitive" } }
        ];
    }
    if (trackId) {
        where.trackId = trackId as string;
    }
    if (tag) {
        where.techTags = { has: tag as string };
    }

    const totalRecords = await prisma.project.count({ where });
    const totalPages = Math.ceil(totalRecords / pageSize);

    const rawProjects = await prisma.project.findMany({
        where,
        include: {
            team: { include: { members: { include: { user: true } } } },
            track: true,
            assets: true,
            answers: { include: { question: true } },
            reviews: { include: { judge: true, scores: true } }
        },
        orderBy: { id: 'asc' }, // Defaults to fixture ID ascending as requested
        skip: (currentPage - 1) * pageSize,
        take: pageSize
    });

    const projects = rawProjects.map(toPublicProjectDTO);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">{event.name} - Project Gallery</h1>
                <Link href={`/events/${eventId}`} className="text-blue-600 hover:underline font-medium">
                    &larr; Back to Event
                </Link>
            </div>

            <ProjectGalleryClient 
                projects={projects}
                tracks={event.tracks}
                isOrganizer={isOrganizer}
                currentPage={currentPage}
                totalPages={totalPages}
                eventId={eventId}
            />
        </div>
    );
}
