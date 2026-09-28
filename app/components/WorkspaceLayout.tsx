import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import WorkspaceLayoutClient from "./WorkspaceLayoutClient";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    
    let isAdmin = false;
    let organizerEventIds: string[] = [];
    let judgingEventIds: string[] = [];
    
    if (session?.user) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isPlatformAdmin: true }
        });
        isAdmin = !!user?.isPlatformAdmin;

        const roles = await prisma.eventRole.findMany({
            where: { userId: session.user.id },
            select: { eventId: true, role: true }
        });
        
        organizerEventIds = roles.filter(r => r.role === "ORGANIZER").map(r => r.eventId);
        judgingEventIds = roles.filter(r => r.role === "JUDGE").map(r => r.eventId);
    }

    return (
        <WorkspaceLayoutClient 
            user={session?.user || null}
            isAdmin={isAdmin}
            organizerEventIds={organizerEventIds}
            judgingEventIds={judgingEventIds}
        >
            {children}
        </WorkspaceLayoutClient>
    );
}
