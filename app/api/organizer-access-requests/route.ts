import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { organizationName, proposedEventName, reason, websiteUrl } = body;

        if (!proposedEventName || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
        }

        if (reason.length < 50 || reason.length > 1500) {
            return NextResponse.json({ error: "Reason must be between 50 and 1500 characters" }, { status: 422 });
        }

        // Check if there is already a PENDING request
        const existingPending = await prisma.organizerAccessRequest.findFirst({
            where: {
                applicantUserId: session.user.id,
                status: "PENDING"
            }
        });

        if (existingPending) {
            return NextResponse.json({ error: "You already have a pending request" }, { status: 409 });
        }

        // Check rate limiting (max 3 per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const recentRequests = await prisma.organizerAccessRequest.count({
            where: {
                applicantUserId: session.user.id,
                createdAt: { gte: today }
            }
        });

        if (recentRequests >= 3) {
            return NextResponse.json({ error: "Rate limit exceeded (max 3 requests per day)" }, { status: 429 });
        }

        const newRequest = await prisma.organizerAccessRequest.create({
            data: {
                applicantUserId: session.user.id,
                organizationName: organizationName || null,
                proposedEventName,
                reason,
                websiteUrl: websiteUrl || null,
                status: "PENDING"
            }
        });

        return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
