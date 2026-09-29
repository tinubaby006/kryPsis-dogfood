# Data Model Overview

The database uses PostgreSQL via Prisma. During Stage 5, the model was expanded to cleanly segment capabilities from simple event roles.

## Core Entities

1. **User**: Standard user with Next.js/Better Auth details. Contains global flags:
   - `isPlatformAdmin`: Can approve organizer requests and manage platform-wide features.
   - `canCreateEvents`: Enables the user to hit `/organizer/events/new`.

2. **Event**: Represents a Hackathon. Tied to an `Organizer`. Tracks `submissionsOpenAt` and `submissionsCloseAt`.

3. **EventRole**: Originally mapped generic roles. Now acts more as a direct relation for permissions over a specific event. An `EventRole` with `role == 'ORGANIZER'` grants management capabilities on that event.

4. **OrganizerAccessRequest** *(New in Stage 5C)*:
   - Tracks requests to gain `canCreateEvents`.
   - Fields: `status` (PENDING, APPROVED, REJECTED, WITHDRAWN, REVOKED), `applicantId`, `reviewerId`, `reason`, and timestamps.
   - **Constraint**: Only one `PENDING` request per `applicantId` at a time.

5. **EventJudgeAccess** *(New in Stage 5D)*:
   - Replaces implicit judge permissions. Explicitly models a judge's access to an event.
   - Allows tracks to be specified via `JudgeTrack`.
   - Supports robust offline invitation flows (linked to an unauthenticated email) using hashed tokens.
   - Statuses: `AWAITING_CONFIRMATION` (needs organizer sign-off), `ACTIVE` (can judge), `REVOKED` (kicked).

6. **TeamInvite** *(New in Stage 5)*:
   - Supports finite use, expiring offline tokens for participants to join teams securely.
   - Fields: `tokenHash`, `maxUses`, `uses`, `expiresAt`, `revokedAt`.

## Constraints & Security

- **Transactions**: Complex state changes (like Approving an Organizer Request and bumping `canCreateEvents`) are done within `prisma.$transaction`.
- **Soft Revocation**: If `canCreateEvents` is revoked or a Judge is set to `REVOKED`, they lose future write-access, but their historical traces (e.g. past events they created, reviews they submitted) remain intact for audit purposes.
