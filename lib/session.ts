import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session;
}

export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true }
  });
  
  if (!user?.isPlatformAdmin) {
    throw new Error("Forbidden: Requires platform admin");
  }
  
  return session.user;
}

export async function getUserEventRole(eventId: string, userId: string) {
  const roleRecord = await prisma.eventRole.findUnique({
    where: {
      eventId_userId_role: {
        eventId,
        userId,
        role: "ORGANIZER" // We could fetch all roles for this user and event
      }
    }
  });
  
  const roles = await prisma.eventRole.findMany({
    where: { eventId, userId },
    select: { role: true }
  });
  
  return roles.map(r => r.role);
}
