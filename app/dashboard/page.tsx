import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function DashboardRedirect() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            eventRoles: {
                select: { role: true }
            }
        }
    });

    if (!user) {
        redirect("/sign-in");
    }

    if (user.isPlatformAdmin) {
        redirect("/admin");
    }

    const isOrganizer = user.canCreateEvents || user.eventRoles.some(r => r.role === "ORGANIZER");
    if (isOrganizer) {
        redirect("/organizer");
    }

    const isJudge = user.eventRoles.some(r => r.role === "JUDGE");
    if (isJudge) {
        redirect("/dashboard/judging");
    }

    // Default for participants / normal users
    redirect("/");
}
