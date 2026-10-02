import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { decision, reason, expectedVersion } = body;

        if (decision !== "APPROVE" && decision !== "REJECT") {
            return NextResponse.json({ error: "Invalid decision" }, { status: 422 });
        }
        if (decision === "REJECT" && !reason) {
            return NextResponse.json({ error: "Reason required for rejection" }, { status: 422 });
        }
        if (typeof expectedVersion !== "number") {
            return NextResponse.json({ error: "expectedVersion is required" }, { status: 422 });
        }

        // Validation for conversion if APPROVED
        if (decision === "APPROVE") {
            const { proposedSlug, timeZone, submissionsCloseAt, maxTeamSize, tracksMode } = body;
            if (!proposedSlug || !timeZone || !submissionsCloseAt || !tracksMode) {
                return NextResponse.json({ error: "Missing required conversion fields" }, { status: 422 });
            }
            if (!/^[a-z0-9-]+$/.test(proposedSlug)) return NextResponse.json({ error: "Invalid slug format" }, { status: 422 });
            if (!["SINGLE_POOL", "MULTI_TRACK"].includes(tracksMode)) return NextResponse.json({ error: "Invalid tracks mode" }, { status: 422 });
        }

        // Transaction for safe approval
        const result = await prisma.$transaction(async (tx) => {
            const req = await tx.organizerAccessRequest.findUnique({ where: { id } });
            
            if (!req) throw new Error("Not found");
            if (req.status !== "PENDING") {
                // If it's identical retry, we can consider it idempotent, but let's stick to 409 for conflicts.
                throw new Error("409 CONFLICT: Request is not PENDING");
            }
            if (req.version !== expectedVersion) {
                throw new Error("409 CONFLICT: Request has been updated (version mismatch)");
            }

            const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
            
            const updatedReq = await tx.organizerAccessRequest.update({
                where: { id },
                data: {
                    status,
                    decisionReason: reason || null,
                    reviewedById: session.user.id,
                    reviewedAt: new Date(),
                    version: { increment: 1 }
                }
            });

            if (decision === "APPROVE") {
                const { proposedSlug, timeZone, submissionsCloseAt, maxTeamSize, tracksMode } = body;
                
                // Convert to EventProposal
                const proposal = await tx.eventProposal.create({
                    data: {
                        applicantUserId: req.applicantUserId,
                        name: req.proposedEventName,
                        proposedSlug: proposedSlug,
                        description: req.reason,
                        timeZone: timeZone,
                        tracksMode: tracksMode,
                        submissionsCloseAt: new Date(submissionsCloseAt), // parseLocalInTimezone could be used but new Date works for datetime-local assuming UTC offset or we trust input
                        maxTeamSize: maxTeamSize,
                        status: "SUBMITTED",
                        submittedAt: new Date()
                    }
                });

                await tx.auditLog.create({
                    data: {
                        action: "LEGACY_REQUEST_CONVERTED",
                        actorUserId: session.user.id,
                        entityType: "EventProposal",
                        entityId: proposal.id,
                        metadata: { legacyRequestId: req.id }
                    }
                });
            }

            await tx.auditLog.create({
                data: {
                    action: `ORGANIZER_ACCESS_${decision}`,
                    actorUserId: session.user.id,
                    entityType: "USER",
                    entityId: req.applicantUserId,
                    metadata: { requestId: id, reason }
                }
            });

            return updatedReq;
        });

        return NextResponse.json({ success: true, request: result });

    } catch (e: any) {
        if (e.message?.includes("409 CONFLICT")) {
            return NextResponse.json({ error: e.message }, { status: 409 });
        }
        if (e.message === "Not found") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}
