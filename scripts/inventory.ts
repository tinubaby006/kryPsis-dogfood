import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const report: string[] = [];
  report.push('# Data Inventory Report');
  
  const counts = await Promise.all([
    prisma.eventRole.count(),
    prisma.eventJudgeAccess.count(),
    prisma.judgingStage.count(),
    prisma.assignmentRun.count(),
    prisma.rubricAssignment.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.stageReview.count(),
    prisma.stageCriterionScore.count(),
    prisma.calculationRun.count(),
    prisma.finalizationSnapshot.count(),
  ]);

  report.push('## Table Counts');
  report.push(`- EventRole: ${counts[0]}`);
  report.push(`- EventJudgeAccess: ${counts[1]}`);
  report.push(`- JudgingStage: ${counts[2]}`);
  report.push(`- AssignmentRun: ${counts[3]}`);
  report.push(`- RubricAssignment statuses:`);
  counts[4].forEach(c => report.push(`  - ${c.status}: ${c._count.status}`));
  report.push(`- StageReview: ${counts[5]}`);
  report.push(`- StageCriterionScore: ${counts[6]}`);
  report.push(`- CalculationRun: ${counts[7]}`);
  report.push(`- FinalizationSnapshot: ${counts[8]}`);

  report.push('## Mock/Manual Artifact Candidates (evt_01)');
  const evt01Stages = await prisma.judgingStage.findMany({ where: { eventId: 'evt_01' } });
  report.push(`- JudgingStages in evt_01: ${evt01Stages.length}`);
  evt01Stages.forEach(s => report.push(`  - ${s.id} (${s.name}): state=${s.state}`));
  
  const mockCalculations = await prisma.calculationRun.findMany({ where: { inputHash: 'migrated' } });
  report.push(`- Mock Calculations (inputHash='migrated'): ${mockCalculations.length}`);
  mockCalculations.forEach(c => report.push(`  - ${c.id}: method=${c.method}`));
  
  // check cross-event resource references? (A bit harder, skip for now, or just do a basic one)
  
  fs.writeFileSync('docs/inventory-report.md', report.join('\n'));
  console.log('Report saved to docs/inventory-report.md');
}

main().catch(console.error).finally(() => prisma.$disconnect());
