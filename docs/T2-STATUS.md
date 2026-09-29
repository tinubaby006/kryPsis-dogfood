**C5 — T4 Score Calculation**: COMPLETED

## Status Summary
- **C2 - Judging Workspace**: Extended the organizer dashboard to support full rubric-stage creation and judge provisioning.
- **C3 - Assignment Algorithm**: Implemented deterministic seeded Mulberry32 assignment with hard bounds and explicit conflict constraints.
- **C4 - Judging Workbench**: Secure judge dashboards locking assignments and preventing peer leakages.
- **C5 - Score Calculation**: Implemented `lib/judging/calculation.ts` utilizing Alternating Minimization Weighted Least Squares (WLS). Exposes an Organizer-only Explainability View (`/results/[stageId]`). Ensures zero false calibrations for disconnected overlapping graphs. Output runs and rank ties are strictly deterministic and idempotent. Built test suite mathematically verifying theoretical bias eliminations. 

### Route Mapping (for Official Runner)
- **Judge Home Dashboard**: `GET /events/[eventId]/judge` (Displays stages, progress, and assignments; requires Judge access)
- **Review Workbench**: `GET /events/[eventId]/judge/assignments/[assignmentId]` (Displays project snapshot and draft/submit rubric form; requires assignment ownership)
- **Save Draft**: `POST (Server Action)` via `saveDraftAction` (Idempotent save, validates auth)
- **Submit Review**: `POST (Server Action)` via `submitReviewAction` (Validates ranges, locks review, idempotent retry)
- **Explainability UI**: `GET /organizer/events/[eventId]/results/[stageId]` (Organizer only)
- **Calculation Commits**: `POST (Server Action)` via `commitCalculationAction` & `finalizeCalculation`

## Blockers
- None. C5 is finished. Ready for C6 (Project Gallery Updates).

## Next Step
**C6 — C6/T2 Polish**
