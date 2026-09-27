import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import path from "path";
import fs from "fs";
import { readFile } from "fs/promises";

export async function GET(req: NextRequest, { params }: { params: Promise<{ storageKey: string }> }) {
    try {
        const { storageKey } = await params;
        if (!storageKey) return new NextResponse("Not Found", { status: 404 });

        // 1. Check DB for asset
        const asset = await prisma.projectAsset.findUnique({
            where: { storageKey },
            include: { project: true }
        });

        // 2. Check Permissions
        if (asset) {
            if (asset.project.status === "DRAFT") {
                const session = await auth.api.getSession({ headers: await headers() });
                if (!session?.user) {
                    return new NextResponse("Unauthorized", { status: 401 });
                }

                // Admins bypass
                const user = await prisma.user.findUnique({ where: { id: session.user.id } });
                if (!user?.isPlatformAdmin) {
                    // Check if team member
                    const member = await prisma.teamMember.findUnique({
                        where: { teamId_userId: { teamId: asset.project.teamId, userId: session.user.id } }
                    });
                    
                    if (!member) {
                        // Check if event organizer
                        const orgRole = await prisma.eventRole.findFirst({
                            where: { eventId: asset.eventId, userId: session.user.id, role: "ORGANIZER" }
                        });
                        
                        // Check if event creator
                        const event = await prisma.event.findUnique({ where: { id: asset.eventId } });

                        if (!orgRole && event?.createdById !== session.user.id) {
                            return new NextResponse("Forbidden", { status: 403 });
                        }
                    }
                }
            }
        }

        // 3. Serve File
        // Prevent path traversal
        const safeKey = path.basename(storageKey);
        const filePath = path.join(process.cwd(), "storage", "uploads", safeKey);

        if (!fs.existsSync(filePath)) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        
        // Determine mime type from extension or DB
        let mimeType = asset?.mimeType;
        if (!mimeType) {
            const ext = path.extname(safeKey).toLowerCase();
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        });
    } catch (e) {
        console.error("Asset error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
