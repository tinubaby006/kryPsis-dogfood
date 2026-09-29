# T2 Implementation Map

## 1. Audit vs. docs/T1-HANDOFF.md
- **Framework & Runtime**: Next.js 16.3.6 (App Router), Node (via Docker). This matches the handoff.
- **ORM & Database**: Prisma v7 (`7.10.0`) and PostgreSQL (`pg` `8.23.0`). Docker Compose specifies `postgres:16-alpine`.
- **Authentication**: Better Auth (`1.7.6`) is configured with Email/Password. `lib/auth.ts` and `app/api/auth/[...all]/route.ts` are present.
- **Package Scripts**: Next.js dev/build/start, ESLint, TypeScript check, Prisma generate/migrate/deploy/studio, Vitest, Playwright, and `assessment:config` exist in `package.json`.

## 2. Feature Implementation Status
- **Organizer Approval**: Implemented. The `OrganizerAccessRequest` model exists, and admins can review via `/admin/organizer-requests`.
- **Judge Invitation/Track Grants**: Implemented. The `EventJudgeAccess` and `EventJudgeAccessTrack` models exist, along with `/invite/[token]` endpoints.
- **Event Dates**: Implemented. `startsAt`, `endsAt`, `submissionsOpenAt`, `submissionsCloseAt`, and `timeZone` are part of the `Event` model.
- **Fixtures**: Implemented. `scripts/seed.ts` loads `fixtures.json`. It is idempotent and preserves the original IDs and historic data structure.
- **Deadline Checks**: Implemented. Submissions close date is verified (submissions after `submissionsCloseAt` return 400).
- **Offline Packaging**: Implemented. `.dogfood.toml` is used for acceptance testing, and a `docker-compose.yml` provides the database. The `BETTER_AUTH_SECRET` uses a fallback for offline demos.

## 3. Migration State & Uniqueness Constraints
- **Migration State**: 4 migrations exist in `prisma/migrations`: `init`, `add_event_timezone`, `add_organizer_requests`, `stage5d_judge_provisioning`.
- **Uniqueness Constraints**:
  - `User`: `@@unique([email])`
  - `EventRole`: `@@unique([eventId, userId, role])`
  - `Track`: `@@unique([id, eventId])`
  - `EventJudgeAccess`: `@@unique([eventId, emailNormalized])`
  - `Review`: `@@unique([eventId, judgeUserId, projectId])`
  - *Note*: Uniqueness survives via composite indexes correctly scoping entities by event.

## 4. Endpoints Exposing Scores or Private Content
- `app/events/[eventId]/projects/page.tsx`: Fetches and exposes `reviews: { include: { judge: true, scores: true } }` on the public gallery.
- `app/events/[eventId]/projects/[projectId]/page.tsx`: Same issue, exposes raw scores on the public project page.
- `/dashboard/judging` (and associated APIs): Runner failed with "judge cannot see peer scores" (returns 200 instead of 401/403 for unauthorized peers/participants), meaning judging checks are missing.

## 5. Mapping T2 Requirements to Existing Components
- **Identity/Event Roles**: No new user models. Re-use `User` and `EventRole`.
- **Judge Assignments**: Will need new assignment tracking logic mapped to `EventJudgeAccessTrack`.
- **Rubric & Scoring**: Re-use `CriterionScore` and `Review`, but introduce frozen `RubricVersion` and `StageReview` models for T2 to avoid modifying historical `FIXTURE` records.
- **CSV Export**: `app/api/export.csv/route.ts` is currently missing (returns 404).

## 6. Proposed Smallest Additive Migration
```prisma
// Minimal T2 Judging Stage Additions

enum StageState {
  DRAFT
  CONFIGURED
  ASSIGNING
  OPEN
  CLOSED
  CALCULATING
  CALCULATED
  FINALIZED
}

model JudgingStage {
  id           String     @id @default(cuid())
  eventId      String
  name         String
  state        StageState @default(DRAFT)
  method       String     @default("RUBRIC")
  requiredReviews Int     @default(1)
  algorithmVer String?
  createdAt    DateTime   @default(now()) @db.Timestamptz
  updatedAt    DateTime   @updatedAt @db.Timestamptz
  
  event        Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  assignments  RubricAssignment[]
  rubrics      RubricVersion[]
}

model RubricVersion {
  id           String       @id @default(cuid())
  stageId      String
  versionHash  String
  createdAt    DateTime     @default(now()) @db.Timestamptz
  
  stage        JudgingStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  criteria     RubricCriterion[]
}

model RubricCriterion {
  id              String        @id @default(cuid())
  rubricVersionId String
  key             String
  title           String
  weightBasisPts  Int
  maxScore        Int
  
  rubricVersion   RubricVersion @relation(fields: [rubricVersionId], references: [id], onDelete: Cascade)
}

model RubricAssignment {
  id           String       @id @default(cuid())
  stageId      String
  projectId    String
  judgeUserId  String
  status       String       @default("PENDING")
  
  stage        JudgingStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  judge        User         @relation(fields: [judgeUserId], references: [id], onDelete: Cascade)
}
```
