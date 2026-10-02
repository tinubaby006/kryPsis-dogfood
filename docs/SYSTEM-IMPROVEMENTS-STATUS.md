# System Improvements Status

## Phase R1: Acceptance & Security Fix
- **Status:** COMPLETED
- **Description:** Fixed authentication, security, and acceptance criteria in the local deployment. Applied the provided patch, re-seeded the database properly with local credentials (T1 claimed, T1 & T2 verified by python checker), and fixed broken tests and endpoint configurations.

## Phase R2: Security & Resource Integrity (Server Guards)
- **Status:** COMPLETED
- **Description:** Centralized server guards for event/resource boundary checks. Fixed cross-resource vulnerabilities in `requireJudgeAccess` and `updateEventConfig`. Hardened `submitReviewAction` with transaction-level state/deadline checks, exact rubric validation, and idempotency logic. Replaced `/api/submit` probe with a robust adapter to the actual project submission service. Validated with cross-event integration tests and python checker.

## Phase R3: Idempotency & Fail-Fast Runtime
- **Status:** COMPLETED
- **Description:** Made the fixture seed script strictly non-destructive (preserving organizer modifications, saving import hashes inside the transaction, preserving demo rubrics). Removed sensitive database URL and session logging. Ensured docker startup fails fast on migration/seed errors. Documented offline runtime versus provisioning internet requirements.

## Phase R4: Disambiguate Event Context Boundaries
- **Status:** COMPLETED
- **Description:** Replaced the overloaded `role` dimension with unambiguous mappings per `SYSTEM-IMPROVEMENTS-PLAN.md`. Relaxed `EventRole` unique constraint to enforce one role per user per event. Added `EventProposal` tracking creation intent to the schema. Rewrote `/dashboard` routing defaults to present explicit choices for Organizers/Judges/Participants. Replaced implicit `canCreateEvents` permission with EventProposals. Re-seeded users safely to enforce single role rules.

## Future Phases (R5 - R10)
- **Status:** NOT STARTED
- **Description:** See `SYSTEM-IMPROVEMENTS-PLAN.md` for full details.
