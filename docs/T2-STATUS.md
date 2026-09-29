# T2 Status

## Current Stage
**C1 — migrations, local runtime and historical compatibility**: COMPLETED

## Status Summary
- Audited the Next.js and Prisma repository in C0.
- Executed C1: Created versioned Prisma migrations (`c1_judging_schema`) adding T2 judging models (`JudgingStage`, `RubricVersion`, `AssignmentRun`, `StageReview`, `ProjectResult`, etc.).
- Preserved historical fixture reviews (using legacy `Review` model with `source="FIXTURE"`).
- Added a separate demo dataset under the `demo` event (featuring a complete deterministic rubric and project dataset) to `scripts/seed.ts`.
- Verified seed idempotency against a secondary `dogfood_test` database successfully.
- Triggered Compose rebuilding which seamlessly applies `migrate deploy` and `db:seed` using the bundled scripts.

## Blockers
- None. C1 is finished and we are ready for C2 (rubric assignment & draft capabilities).

## Next Step
**C2 — T2 Rubric judging logic & backend routes**
