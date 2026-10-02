import { prisma } from "../lib/db";
import * as crypto from "crypto";

async function main() {
    const eventId = "cmuqgd6sh00005wuq8bjux78o";
    const stageId = "cmuqhw93o000p5wuqsz6iu9ih";
    
    const stage = await prisma.judgingStage.findUnique({ where: { id: stageId, eventId } });
    if (!stage) { console.log("Stage not found"); return; }
    
    if (stage.state === "CALCULATED") {
        const run = await prisma.calculationRun.findFirst({
            where: { stageId },
            orderBy: { finishedAt: 'desc' },
            include: { projectResults: true }
        });
        
        if (!run) { console.log("No calculation run"); return; }
        
        const pending = await prisma.rubricAssignment.count({
            where: { stageId, status: "PENDING" }
        });
        if (pending > 0) {
            console.log("Cannot finalize: pending assignments");
            return;
        }
        
        const canonicalHashStr = run.projectResults.sort((a: any,b: any) => (a.rank||0) - (b.rank||0)).map((r: any) => `${r.projectId}:${r.normalizedMean}`).join(",");
        const canonicalHash = crypto.createHash("sha256").update(canonicalHashStr).digest("hex");

        await prisma.$transaction(async (tx) => {
            await tx.finalizationSnapshot.create({
                data: {
                    stageId,
                    calculationRunId: run.id,
                    canonicalHash,
                    finalizedById: "script",
                    snapshotData: { runId: run.id, resultsCount: run.projectResults.length }
                }
            });

            await tx.judgingStage.update({
                where: { id: stageId },
                data: { state: "FINALIZED" }
            });
        });
        
        console.log("Finalized!");
    }
    
    await prisma.judgingStage.update({
        where: { id: stageId },
        data: { 
            outputPolicy: { 
                isPublished: true 
            } 
        }
    });
    
    console.log("Published!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
