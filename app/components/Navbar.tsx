import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
    const session = await getSession();
    let isAdmin = false;
    let organizerEventIds: string[] = [];

    if (session?.user) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isPlatformAdmin: true }
        });
        
        isAdmin = !!user?.isPlatformAdmin;

        if (!isAdmin) {
            const orgRoles = await prisma.eventRole.findMany({
                where: { userId: session.user.id, role: { in: ["ORGANIZER"] } },
                select: { eventId: true }
            });
            organizerEventIds = orgRoles.map(r => r.eventId);
        }
    }

    return (
        <NavbarClient 
            user={session?.user || null} 
            isAdmin={isAdmin} 
            organizerEventIds={organizerEventIds} 
        />
    );
}
