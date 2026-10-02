# Data Model

The data model for Dogfood is built using Prisma ORM v7 and PostgreSQL.

## Core Models

### Core Identities & Access
- **User:** All participants, judges, and organizers. Authentication is handled by Better Auth.
- **EventRole & EventJudgeAccess:** Fine-grained event capability mapping. There are no global roles (except `isPlatformAdmin`). An Organizer for Event A has zero privileges in Event B. `EventJudgeAccess` determines current active judge eligibility (e.g. tracking revocations).
- **EventProposal:** Allows users to request events. When an admin approves, it automatically provisions an `Event` and creates the `ORGANIZER` role.

### Event Structuring
- **Event:** A hackathon instance with settings (like `submissionsCloseAt`) and `TracksMode`.
  - *`SINGLE_POOL` (No-Track)*: Bypasses tracks. Judging operates globally across the event.
  - *`MULTI_TRACK`*: Stages and assignments are isolated by `Track`.
- **Project Lifecycle:** Projects exist globally within an Event but are explicitly enrolled into judging rounds via `StageProject`.

### Judging & Calibration (T2)
- **JudgingStage:** An isolated, structured round of judging for a frozen subset of projects. Stages transition strictly from `DRAFT` ➔ `OPEN` ➔ `CLOSED` ➔ `CALCULATED` ➔ `FINALIZED`.
  - **`origin` Enum**: Stages are explicitly either `LIVE` (real interactive rounds) or `FIXTURE` (historical read-only legacy projections).
- **RubricAssignment & AssignmentStatus:** Explicit tracking (`PENDING`, `COMPLETED`, `CANCELLED`) for every judge/project pair. We map final submissions strictly via `StageReview`.
- **StageReview & CriterionScore:** The final, immutable submission of a judge. For historical records, the original `submittedAt` is `null` (since it was untracked in legacy imports) and tracked via an explicit `importedAt` timestamp.
- **RubricVersion & RubricCriterion:** Immutable definitions of judging criteria and weights attached to a specific `JudgingStage`.

### Calculation & Auditing
- **CalculationRun:** Records an algorithmic normalisation attempt for a closed stage (e.g., `pair_overlap_wls_v3`). Stores the method, config/input hashes, and any invalidation metadata (e.g. if the run was a mock).
- **FinalizationSnapshot:** A cryptographically hashed and immutable canonical JSON snapshot containing the completed state, results, and proof of a judging round. Once a stage is `FINALIZED`, this snapshot becomes the absolute truth for all gallery and export routes, ensuring that subsequent un-published calculations cannot alter public data.
- **FixtureImport:** Tracks the deterministic importation of manual, historical legacy scores, mapping them to modern stage projections cleanly via `fixtureImportId`.
