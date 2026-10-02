-- CreateEnum
CREATE TYPE "EventProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropIndex
DROP INDEX "EventRole_eventId_userId_role_key";

-- CreateTable
CREATE TABLE "EventProposal" (
    "id" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proposedSlug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "tracksMode" TEXT NOT NULL DEFAULT 'SINGLE_POOL',
    "startsAt" TIMESTAMPTZ,
    "endsAt" TIMESTAMPTZ,
    "submissionsOpenAt" TIMESTAMPTZ,
    "submissionsCloseAt" TIMESTAMPTZ NOT NULL,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 4,
    "status" "EventProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMPTZ,
    "reviewedAt" TIMESTAMPTZ,
    "reviewedById" TEXT,
    "decisionReason" TEXT,
    "approvedEventId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EventProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventProposal_approvedEventId_key" ON "EventProposal"("approvedEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRole_eventId_userId_key" ON "EventRole"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventProposal" ADD CONSTRAINT "EventProposal_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProposal" ADD CONSTRAINT "EventProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProposal" ADD CONSTRAINT "EventProposal_approvedEventId_fkey" FOREIGN KEY ("approvedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

