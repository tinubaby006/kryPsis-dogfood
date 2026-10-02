import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import WorkspaceLayoutClient from "./WorkspaceLayoutClient";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    
    let isAdmin = false;
    let events: any[] = [];
    
    if (session?.user) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isPlatformAdmin: true }
        });
        isAdmin = !!user?.isPlatformAdmin;

        const roles = await prisma.eventRole.findMany({
            where: { userId: session.user.id },
            select: { eventId: true, role: true, event: { select: { id: true, name: true, slug: true } } }
        });
        
        // Group by event
        const eventsMap = new Map<string, any>();
        for (const r of roles) {
            if (!eventsMap.has(r.eventId)) {
                eventsMap.set(r.eventId, { ...r.event, roles: [] });
            }
            eventsMap.get(r.eventId).roles.push(r.role);
        }
        events = Array.from(eventsMap.values());
    }

    return (
        <WorkspaceLayoutClient 
            user={session?.user || null}
            isAdmin={isAdmin}
            events={events}
        >
            {children}
        </WorkspaceLayoutClient>
    );
}
