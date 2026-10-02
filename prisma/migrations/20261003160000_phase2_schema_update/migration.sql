-- CreateEnum
CREATE TYPE "TracksMode" AS ENUM ('SINGLE_POOL', 'MULTI_TRACK');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CalculationRun" ADD COLUMN     "invalidatedAt" TIMESTAMPTZ,
ADD COLUMN     "invalidationReason" TEXT;

-- AlterTable Event
ALTER TABLE "Event" ALTER COLUMN "tracksMode" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "tracksMode" TYPE "TracksMode" USING "tracksMode"::text::"TracksMode";
ALTER TABLE "Event" ALTER COLUMN "tracksMode" SET DEFAULT 'SINGLE_POOL';

-- AlterTable EventProposal
ALTER TABLE "EventProposal" ALTER COLUMN "tracksMode" DROP DEFAULT;
ALTER TABLE "EventProposal" ALTER COLUMN "tracksMode" TYPE "TracksMode" USING "tracksMode"::text::"TracksMode";
ALTER TABLE "EventProposal" ALTER COLUMN "tracksMode" SET DEFAULT 'SINGLE_POOL';

-- AlterTable JudgingStage
ALTER TABLE "JudgingStage" ADD COLUMN     "activeRubricVersionId" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMPTZ,
ADD COLUMN     "fixtureImportId" TEXT,
ADD COLUMN     "origin" "RecordSource" NOT NULL DEFAULT 'LIVE',
ADD COLUMN     "publishedSnapshotId" TEXT;

-- AlterTable RubricAssignment
ALTER TABLE "RubricAssignment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RubricAssignment" ALTER COLUMN "status" TYPE "AssignmentStatus" USING (
  CASE 
    WHEN "status"::text = 'SUBMITTED' THEN 'COMPLETED'::"AssignmentStatus"
    ELSE "status"::text::"AssignmentStatus"
  END
);
ALTER TABLE "RubricAssignment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable StageProject
ALTER TABLE "StageProject" ADD COLUMN     "projectSnapshot" JSONB;

-- AlterTable StageReview
ALTER TABLE "StageReview" ADD COLUMN     "fixtureImportId" TEXT,
ADD COLUMN     "importedAt" TIMESTAMPTZ,
ADD COLUMN     "origin" "RecordSource" NOT NULL DEFAULT 'LIVE',
ADD COLUMN     "sourceRecordKey" TEXT,
ALTER COLUMN "submittedAt" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "FinalizationSnapshot_stageId_key" ON "FinalizationSnapshot"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgingStage_fixtureImportId_key" ON "JudgingStage"("fixtureImportId");

-- CreateIndex
CREATE UNIQUE INDEX "StageReview_fixtureImportId_sourceRecordKey_key" ON "StageReview"("fixtureImportId", "sourceRecordKey");

-- AddForeignKey
ALTER TABLE "JudgingStage" ADD CONSTRAINT "JudgingStage_fixtureImportId_fkey" FOREIGN KEY ("fixtureImportId") REFERENCES "FixtureImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingStage" ADD CONSTRAINT "JudgingStage_activeRubricVersionId_fkey" FOREIGN KEY ("activeRubricVersionId") REFERENCES "RubricVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingStage" ADD CONSTRAINT "JudgingStage_publishedSnapshotId_fkey" FOREIGN KEY ("publishedSnapshotId") REFERENCES "FinalizationSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageReview" ADD CONSTRAINT "StageReview_fixtureImportId_fkey" FOREIGN KEY ("fixtureImportId") REFERENCES "FixtureImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
