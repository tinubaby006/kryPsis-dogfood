# T2 Implementation Map

## Existing Platform Components
- **Framework:** Next.js 16.3.6 (App Router)
- **Runtime:** Node (via Docker)
- **ORM:** Prisma v7 (`7.10.0`)
- **Database:** PostgreSQL (`pg` `8.23.0`) via docker compose `db` service (Postgres 16-alpine)
- **Authentication:** Better Auth (`1.7.6`) with Email/Password

## Domain Models (from `prisma/schema.prisma`)
- `User`: Reused for all participants, judges, organizers, and admins.
- `Event`, `Track`, `Team`, `Project`: Core entities. `Project` holds both drafts and final submissions based on `status`.
- `EventRole`: Manages event-level roles (`PARTICIPANT`, `JUDGE`, `ORGANIZER`).
- `Review` & `CriterionScore`: Existing models to store reviews and rubric score values. Historical imported reviews use these models with `source = FIXTURE`.

## Server Services and API Endpoints
- `/api/auth/[...all]`: Better Auth endpoints.
- `lib/session.ts`: `getSession`, `requirePlatformAdmin`, `getUserEventRole` are implemented.
- **Security Gaps Identified:**
  - `/dashboard/judging`: The runner failed `judge cannot see peer scores` and `participant blocked`. It currently returns 200, exposing peer scores and allowing participants access.
  - `/api/export.csv`: Returns 404. Needs to be implemented for T2 CSV export requirement.

## Current T1 Workflows
- **Organizer Approval:** `OrganizerAccessRequest` model in DB. T1 flow is implemented with `PENDING` state and admin review.
- **Judge Invitations:** `EventJudgeAccess` model in DB. Flow supports invites and token claims.
- **Event Dates/Deadlines:** Submissions deadline is checked, yielding 400 when closed.
- **Fixtures/Seed:** `scripts/seed.ts` loads `fixtures.json`. Preserves IDs, idempotent handling using unique checks.
- **Offline Packaging:** Docker setup provided with `.dogfood.toml`. No cloud services required.

## Proposed Minimal Additive Schema (for C1)
- Extend `Event` and `Track` with `JudgingStage` to define config.
- Add `JudgingStage`, `StageProject`, `StageJudge` for stage scopes and populations.
- Add `RubricVersion` and `RubricCriterion` for frozen, versioned rubrics.
- Add `AssignmentRun`, `RubricAssignment` for deterministic tracking.
- Add `CalculationRun`, `ProjectResult`, `JudgeCalibration` for WLS normalization.
