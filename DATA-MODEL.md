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
  - Submissions are evaluated directly against an event's `EventTrack`.
  - NOTE: Privacy controls preventing cross-judge score views are missing (known T2 failure).
