# T2 Status

## Current Stage
**C2 — T2 Rubric judging logic & backend routes**: COMPLETED

## Status Summary
- **Judging Workspace**: Extended the organizer dashboard (`JudgesSection` and `JudgingStagesSection`) to support full rubric-stage creation and judge provisioning.
- **Judge Access**: Reused the `EventJudgeAccess` token flow. Offline/copyable URLs are generated without SMTP. Validation guarantees invites only map to the explicitly authorized identity. Activation/Suspension (`/reactivate` & `/revoke`) toggles the explicit `JUDGE` `EventRole`.
- **Judging Stages**: Configurable `JudgingStage` forms enforce R (required reviews), scopes (Event vs Track), integer basis weight checks (sum strictly 10000), and valid dates (Zod schemas).
- **State Machine**: Supported transitions locked behind `advanceStageState()` inside transactional updates:
  - `DRAFT -> CONFIGURED`: Automatic upon valid rubric configuration.
  - `CONFIGURED -> DRAFT`: Configuration reverts if structural stage properties are modified.
  - `CONFIGURED -> ASSIGNING -> OPEN`: Implemented transactionally. "Open Judging" explicitly freezes the judge panel (`StageJudge`) and eligible population (`StageProject`) snapshots.
  - `OPEN -> CLOSED -> CALCULATING -> CALCULATED -> FINALIZED`: Base transitions supported in the state machine core, pending UI logic in future execution phases.

## Blockers
- None. C2 is finished and we are ready for C3 (Assignment generation).

## Next Step
**C3 — T3 Assignment runs**
