# Data Model

The data model for Dogfood is built using Prisma ORM. 

## Key Models
- **User:** Represents all participants, judges, and organizers. Authentication is integrated with Better Auth.
- **Event:** A hackathon event containing settings (e.g., deadlines).
- **Project:** Created by teams as their submission. Includes a unified structure for versions, drafts, and submissions.
- **Role System:**
  - `EventRole` manages event-specific capabilities (`PARTICIPANT`, `JUDGE`, `ORGANIZER`).
  - Access controls are enforced at the application tier.
- **Judging:**
  - `AssessmentCredential` binds a user to a specific judging track.
  - T1 Legacy models (`Review` and `CriterionScore`) are kept as historical FIxTURE evidence.
  - **T2 Judging System (C1)**:
    - `JudgingStage` & `StageProject`: Represents isolated judging rounds with frozen populations.
    - `StageJudge` & `RubricAssignment`: Explicit judge allocation with tracking (`ReviewDraft`, `StageReview`).
    - `RubricVersion` & `RubricCriterion`: Immutable rubrics tied to a stage.
    - `CalculationRun` & `ProjectResult`: Computation snapshots mapping raw scores to WLS rankings.
    - `FinalizationSnapshot` & `AuditEvent`: Audit logs and cryptographically hashed final results.
