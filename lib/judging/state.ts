import { prisma } from "@/lib/db";

export class StateMachineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StateMachineError";
    }
}

export const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ["CONFIGURED"],
    CONFIGURED: ["ASSIGNING", "DRAFT"],
    ASSIGNING: ["OPEN", "CONFIGURED"], // Revert to configured if failure
    OPEN: ["CLOSED"],
    CLOSED: ["CALCULATING", "OPEN"], // Allow reopen
    CALCULATING: ["CALCULATED", "CLOSED"],
    CALCULATED: ["FINALIZED", "CLOSED"],
    FINALIZED: [] // Terminal
};

export async function advanceStageState(stageId: string, toState: string, actorId: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
        const stage = await tx.judgingStage.findUnique({
            where: { id: stageId },
            include: { event: true }
        });
        
        if (!stage) throw new StateMachineError("Stage not found");
        
        const validNext = VALID_TRANSITIONS[stage.state] || [];
        if (!validNext.includes(toState)) {
            throw new StateMachineError(`Invalid transition from ${stage.state} to ${toState}`);
        }

        const updated = await tx.judgingStage.update({
            where: { id: stageId },
            data: { state: toState as any }
        });

        await tx.auditEvent.create({
            data: {
                stageId,
                eventId: stage.eventId,
                actorUserId: actorId,
                action: `TRANSITION_TO_${toState}`,
                entityType: "JudgingStage",
                entityId: stageId,
                reason: reason || "User triggered transition",
                metadata: { from: stage.state, to: toState }
            }
        });

        return updated;
    });
}
