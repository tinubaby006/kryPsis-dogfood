# Implementation Decisions

This document tracks intentional technical choices made in fulfilling the hackathon requirements where the prompt left ambiguity or invited a decision.

## Stage 0 Context & Validation

### Source File Hashes
*   `fixtures.json`: 252896BC45D49FCA69AD413BE40C6BFDE9D9B9F9DD8DB702B3FF74EAAA181121
*   `spec.md`: 644B92EB50A37215CB992589E451850AB95CB14803BBAD3905FD8B071BFBD696
*   `run.py`: AA98963841BC8E18E8E5D76F0499697C093DD3C0055F9D73A459F592F4DCF09D

### Fixture Counts (Verified via Node script)
*   Events: 1
*   Tracks: 8
*   Judges: 30
*   Teams: 40
*   Projects: 41
*   Scores/Reviews: 126

### The 41-Project Duplicate
*   The raw data contains 41 project records for only 40 teams. `prj_41` duplicates `prj_07` (team `tm_07`, title `Dry Harbour`, and repository URL).
*   **Decision**: We will not deduplicate or silently delete this entry. It will be loaded into the database as a separate project with `duplicateOfId` correctly mapped to `prj_07` (or noted in `ImportIssue` / provenance depending on our final schema). Both will exist since a team might submit twice by mistake.

### Package-Version Choices
*   **Next.js & React**: Pinned to the existing `16.3.6` and `19.2.8` respectively, preventing major upgrade breaks.
*   **Prisma**: Pinned to `^7.10.0` (with `@prisma/adapter-pg` and `@prisma/client` exactly matched).
*   **Auth**: `better-auth` pinned to `^1.7.6` to ensure stable local credentials without surprise breaking changes.

### Event-Role Design
*   Roles are contextual to an `Event`. The global `User` object only has `isPlatformAdmin` and `canCreateEvents` capabilities.
*   The `EventRole` model handles mappings (PARTICIPANT, JUDGE, ORGANIZER) per event.
*   A user can be an organizer for one event, and a participant for another. 

### Import Assumptions
*   **Users & Teams**: The original data provides 91 emails for teams, but no names or passwords. We will create these users with generated local passwords. The first member listed for each team is assumed to be the "OWNER" since no ownership flag exists in `fixtures.json`.
*   **Missing Scores**: Missing scores for judges will be left as empty slots. We will not fabricate assignments for them.

### Scope Boundaries (T1 Focus)
*   Stage 0 sets up dependencies and architecture purely to support T1.
*   We explicitly defer T2 (judge assignments, peer-score isolation, and rubric editing) and T3/T4 (public voting, rankings, and API endpoints).
*   Our focus for the next stages will be login, forms, draft concurrency checks, and public SSR galleries.
