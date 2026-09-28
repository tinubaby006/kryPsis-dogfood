-- CreateEnum
CREATE TYPE "OrganizerAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'REVOKED');

-- CreateTable
CREATE TABLE "OrganizerAccessRequest" (
    "id" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "organizationName" TEXT,
    "proposedEventName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "status" "OrganizerAccessStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMPTZ,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrganizerAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerAccessRequest_status_createdAt_idx" ON "OrganizerAccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizerAccessRequest_applicantUserId_createdAt_idx" ON "OrganizerAccessRequest"("applicantUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizerAccessRequest" ADD CONSTRAINT "OrganizerAccessRequest_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerAccessRequest" ADD CONSTRAINT "OrganizerAccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
