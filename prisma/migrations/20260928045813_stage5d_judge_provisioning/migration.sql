-- CreateEnum
CREATE TYPE "EventJudgeAccessStatus" AS ENUM ('INVITED', 'AWAITING_CONFIRMATION', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "EventJudgeAccess" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "userId" TEXT,
    "status" "EventJudgeAccessStatus" NOT NULL,
    "tokenHash" TEXT,
    "invitedById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "acceptedAt" TIMESTAMPTZ,
    "confirmedAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EventJudgeAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventJudgeAccessTrack" (
    "accessId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "EventJudgeAccessTrack_pkey" PRIMARY KEY ("accessId","trackId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventJudgeAccess_tokenHash_key" ON "EventJudgeAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "EventJudgeAccess_eventId_status_idx" ON "EventJudgeAccess"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventJudgeAccess_eventId_emailNormalized_key" ON "EventJudgeAccess"("eventId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "EventJudgeAccess_id_eventId_key" ON "EventJudgeAccess"("id", "eventId");

-- AddForeignKey
ALTER TABLE "EventJudgeAccess" ADD CONSTRAINT "EventJudgeAccess_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJudgeAccess" ADD CONSTRAINT "EventJudgeAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJudgeAccess" ADD CONSTRAINT "EventJudgeAccess_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJudgeAccess" ADD CONSTRAINT "EventJudgeAccess_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJudgeAccessTrack" ADD CONSTRAINT "EventJudgeAccessTrack_accessId_eventId_fkey" FOREIGN KEY ("accessId", "eventId") REFERENCES "EventJudgeAccess"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventJudgeAccessTrack" ADD CONSTRAINT "EventJudgeAccessTrack_trackId_eventId_fkey" FOREIGN KEY ("trackId", "eventId") REFERENCES "Track"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;
