**C4 — Review Collection**: COMPLETED

## Status Summary
- **C2 - Judging Workspace**: Extended the organizer dashboard to support full rubric-stage creation and judge provisioning.
- **C3 - Assignment Algorithm**: Implemented `lib/judging/assignment.ts` with seeded Mulberry32 deterministic assignment, capacity bounding, explicit conflicts evasion, and connectivity constraints. Previews and commits use transaction hashes for double-click idempotency.
- **C4 - Judging Workbench**: 
  - `lib/judging/auth.ts`: Strict server authorization guarding identity, `JUDGE` role, stage membership, and assignment ownership.
  - `app/events/[eventId]/judge/page.tsx`: Judge Dashboard for assignment progress.
  - `app/events/[eventId]/judge/assignments/[assignmentId]/page.tsx`: Review Workbench featuring isolated frozen rubrics, project snapshots, draft saves, and idempotent final submissions.
  - Peer scores are secured via `assignment.judgeUserId === session.user.id` checks and excluded from public DTOs.

### Route Mapping (for Official Runner)
- **Judge Home Dashboard**: `GET /events/[eventId]/judge` (Displays stages, progress, and assignments; requires Judge access)
- **Review Workbench**: `GET /events/[eventId]/judge/assignments/[assignmentId]` (Displays project snapshot and draft/submit rubric form; requires assignment ownership)
- **Save Draft**: `POST (Server Action)` via `saveDraftAction` (Idempotent save, validates auth)
- **Submit Review**: `POST (Server Action)` via `submitReviewAction` (Validates ranges, locks review, idempotent retry)

## Blockers
- None. C4 is finished. Ready for C5 (T4 Score Calculation).

## Next Step
**C5 — T4 Score Calculation**
