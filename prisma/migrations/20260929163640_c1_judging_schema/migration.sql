-- CreateEnum
CREATE TYPE "StageState" AS ENUM ('DRAFT', 'CONFIGURED', 'ASSIGNING', 'OPEN', 'CLOSED', 'CALCULATING', 'CALCULATED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "StageScope" AS ENUM ('EVENT', 'TRACK', 'OVERALL');

-- CreateTable
CREATE TABLE "JudgingStage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "StageState" NOT NULL DEFAULT 'DRAFT',
    "method" TEXT NOT NULL DEFAULT 'RUBRIC',
    "scope" "StageScope" NOT NULL DEFAULT 'EVENT',
    "scopeKey" TEXT NOT NULL,
    "trackId" TEXT,
    "requiredReviews" INTEGER NOT NULL DEFAULT 1,
    "algorithmVer" TEXT,
    "configHash" TEXT,
    "outputPolicy" JSONB,
    "startsAt" TIMESTAMPTZ,
    "endsAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "JudgingStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageProject" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "versionSnapshot" INTEGER NOT NULL,
    "eligibility" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageJudge" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "eligibility" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageJudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricVersion" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "versionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "helpText" TEXT,
    "weightBasisPts" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRun" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "seed" TEXT,
    "configHash" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "diagnostics" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricAssignment" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDraft" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "comment" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ReviewDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageReview" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "rubricVersionId" TEXT NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageCriterionScore" (
    "reviewId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "StageCriterionScore_pkey" PRIMARY KEY ("reviewId","criterionId")
);

-- CreateTable
CREATE TABLE "CalculationRun" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "configHash" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "implVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "diagnostics" JSONB,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,

    CONSTRAINT "CalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeCalibration" (
    "id" TEXT NOT NULL,
    "calculationRunId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "offset" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "diagnostics" JSONB,

    CONSTRAINT "JudgeCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectResult" (
    "id" TEXT NOT NULL,
    "calculationRunId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "rawMean" DOUBLE PRECISION NOT NULL,
    "normalizedMean" DOUBLE PRECISION NOT NULL,
    "displayedMean" DOUBLE PRECISION NOT NULL,
    "sd" DOUBLE PRECISION,
    "rank" INTEGER,
    "tieKey" TEXT,

    CONSTRAINT "ProjectResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalizationSnapshot" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "calculationRunId" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "finalizedById" TEXT NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "finalizedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalizationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "stageId" TEXT,
    "eventId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JudgingStage_eventId_name_key" ON "JudgingStage"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StageProject_stageId_projectId_key" ON "StageProject"("stageId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StageJudge_stageId_judgeUserId_key" ON "StageJudge"("stageId", "judgeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterion_rubricVersionId_key_key" ON "RubricCriterion"("rubricVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRun_stageId_version_key" ON "AssignmentRun"("stageId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RubricAssignment_stageId_projectId_judgeUserId_key" ON "RubricAssignment"("stageId", "projectId", "judgeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDraft_assignmentId_key" ON "ReviewDraft"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StageReview_assignmentId_key" ON "StageReview"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculationRun_stageId_configHash_inputHash_key" ON "CalculationRun"("stageId", "configHash", "inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeCalibration_calculationRunId_judgeUserId_key" ON "JudgeCalibration"("calculationRunId", "judgeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectResult_calculationRunId_projectId_key" ON "ProjectResult"("calculationRunId", "projectId");

-- AddForeignKey
ALTER TABLE "JudgingStage" ADD CONSTRAINT "JudgingStage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingStage" ADD CONSTRAINT "JudgingStage_trackId_eventId_fkey" FOREIGN KEY ("trackId", "eventId") REFERENCES "Track"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageProject" ADD CONSTRAINT "StageProject_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageProject" ADD CONSTRAINT "StageProject_projectId_eventId_fkey" FOREIGN KEY ("projectId", "eventId") REFERENCES "Project"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageJudge" ADD CONSTRAINT "StageJudge_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageJudge" ADD CONSTRAINT "StageJudge_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricVersion" ADD CONSTRAINT "RubricVersion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "RubricVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRun" ADD CONSTRAINT "AssignmentRun_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricAssignment" ADD CONSTRAINT "RubricAssignment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricAssignment" ADD CONSTRAINT "RubricAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricAssignment" ADD CONSTRAINT "RubricAssignment_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricAssignment" ADD CONSTRAINT "RubricAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AssignmentRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDraft" ADD CONSTRAINT "ReviewDraft_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RubricAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDraft" ADD CONSTRAINT "ReviewDraft_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageReview" ADD CONSTRAINT "StageReview_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RubricAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageReview" ADD CONSTRAINT "StageReview_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "RubricVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageCriterionScore" ADD CONSTRAINT "StageCriterionScore_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "StageReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageCriterionScore" ADD CONSTRAINT "StageCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationRun" ADD CONSTRAINT "CalculationRun_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeCalibration" ADD CONSTRAINT "JudgeCalibration_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeCalibration" ADD CONSTRAINT "JudgeCalibration_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResult" ADD CONSTRAINT "ProjectResult_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "CalculationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResult" ADD CONSTRAINT "ProjectResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalizationSnapshot" ADD CONSTRAINT "FinalizationSnapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalizationSnapshot" ADD CONSTRAINT "FinalizationSnapshot_calculationRunId_fkey" FOREIGN KEY ("calculationRunId") REFERENCES "CalculationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalizationSnapshot" ADD CONSTRAINT "FinalizationSnapshot_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JudgingStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
