"use server";

import { requirePlatformAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleCanCreateEvents(userId: string, canCreateEvents: boolean) {
    const admin = await requirePlatformAdmin();
    
    // Admin cannot toggle themselves
    if (admin.id === userId) {
        return { error: "Cannot modify your own permissions" };
    }

    const targetUser = await prisma.user.update({
        where: { id: userId },
        data: { canCreateEvents }
    });

    // Write audit log
    await prisma.auditLog.create({
        data: {
            actorUserId: admin.id,
            action: "UPDATE_PERMISSIONS",
            entityType: "USER",
            entityId: userId,
            metadata: { canCreateEvents }
        }
    });

    revalidatePath("/admin");
    return { success: true, user: targetUser };
}
