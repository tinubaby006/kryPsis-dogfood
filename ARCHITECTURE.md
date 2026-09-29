# Architecture Overview

Dogfood Hack is built on **Next.js 16** (App Router) and uses **Prisma** with PostgreSQL for the database layer.

## System Components

1. **Authentication (Better Auth)**: Handles sessions, credential login, and user verification. 
2. **Database Layer (Prisma Postgres)**: Manages all operational state including additive schema migrations for Stage 5 workflows.
3. **Dual Layout System**: 
   - `layout.tsx`: A lightweight public-facing shell for the landing page and public galleries.
   - `WorkspaceLayout.tsx`: A dense, authenticated sidebar navigation for organizers, judges, participants, and admins.
4. **Server Actions**: Mutations are executed via Server Actions (e.g. `upsertProject`, `generateInvite`, `createEvent`) ensuring strong server-side validation.

## State Transitions (Stage 5 Additions)

### Organizer Capabilities
Organizer access is no longer implicitly granted. It follows a strict state machine:
- `PENDING`: A user applies for capabilities. Only one pending request per user.
- `APPROVED`: Admin confirms capability. The user is now granted `canCreateEvents = true`.
- `REJECTED`: Admin denies capability with an optional reason.
- `WITHDRAWN`: User cancels their request.
- `REVOKED`: An admin revokes `canCreateEvents` from an approved user. They retain management of existing events but cannot create new ones.

### Judge Provisioning
Judges are provisioned on an event basis:
- `AWAITING_CONFIRMATION`: An offline judge invite link is accepted by a new or unverified user. The organizer must confirm them.
- `ACTIVE`: Judge has confirmed access to specific tracks.
- `REVOKED`: Judge loses access. Their historic reviews are retained but they can no longer access the workspace.

## Additive Migrations

As requested by Stage 5 requirements, all migrations were additive:
- Created `OrganizerAccessRequest` without altering the core `User` constraints initially.
- Created `EventJudgeAccess` and `TeamInvite` to expand relations cleanly.
- Added `canCreateEvents` to `User` rather than relying solely on `isPlatformAdmin`.
