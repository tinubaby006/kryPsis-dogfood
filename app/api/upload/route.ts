import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File exceeds 5MB limit." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storageKey = crypto.randomUUID() + path.extname(file.name);
        
        const uploadsDir = path.join(process.cwd(), "storage", "uploads");
        
        // Ensure directory exists
        if (!fs.existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, storageKey);
        await writeFile(filePath, buffer);

        return NextResponse.json({
            storageKey,
            originalName: file.name,
            mimeType: file.type,
            bytes: file.size
        });
    } catch (e: any) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
