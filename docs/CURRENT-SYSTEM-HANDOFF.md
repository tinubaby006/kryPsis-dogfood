# Current System Handoff

**Date**: 2026-10-02
**Baseline Commit**: `a03c167867c4c73813cebac0fc28da6cbd8227c4`
**Local Changes**: None tracked. (`docs/SYSTEM-IMPROVEMENTS-PLAN.md` and `docs/SYSTEM-IMPROVEMENTS-REQUIREMENTS.md` are untracked).

## System Inspection

### Installed Versions
- **Next.js**: 16.3.6 (App Router)
- **TypeScript**: ^5.x
- **Prisma**: ^7.10.0 (@prisma/client, @prisma/adapter-pg, prisma)
- **Better Auth**: ^1.7.6
- **PostgreSQL**: pg ^8.23.0
- **UI Stack**: Tailwind CSS v4, shadcn/ui, base-ui

### Existing Routes & App Structure
- **Global Actions**: `app/actions/` contains logic for events, stages, judging, etc.
- **Admin/Organizer**: `app/admin/`, `app/organizer/`, `app/organizer-access/`
- **Dashboards**: `app/dashboard/`, `app/judge-invitations/`
- **Core APIs**: `app/api/auth/`, `app/api/assets/`
- **Auth Flow**: `app/sign-in/`, `app/sign-up/`

### Prisma Schema and Migrations
- **Schema**: Contains the `EventRole` model which allows multiple roles per user per event via `@@unique([eventId, userId, role])`. Also contains judging/event models (Event, Track, StageProject, StageJudge, RubricVersion, etc.).
- **Migrations**: 5 migrations present up to `20260929163640_c1_judging_schema`.
- **Seed**: Available at `scripts/seed.ts`. Seed script is invoked via `tsx`.

### Local Compose Configuration
- **Database (db)**: `postgres:16-alpine`, exposed on `127.0.0.1:5432`, user `dogfood`, DB `dogfood_db`.
- **App (app)**: Runs Next.js on `127.0.0.1:3000`. Connects to `postgres://dogfood:dogfoodpassword@db:5432/dogfood_db`.

## Procedures

### Database Backup & Restore
Since the app relies on a local PostgreSQL container, you can safely back up and restore data without losing state using `pg_dump` and `pg_restore`.

**Backup Command**:
```bash
docker compose exec db pg_dump -U dogfood -F c dogfood_db > backup.dump
```

**Restore Command**:
```bash
docker compose exec -T db pg_restore -U dogfood -d dogfood_db -1 -c < backup.dump
```
*Note: Ensure to run these commands in the root of the project where `docker-compose.yml` resides.*

## Audits and Checks

### Duplicate `EventRole` Audit
A script was prepared (`scratch/audit.ts`) to query the database and group duplicate event/user combinations.
**Result**: Total EventRoles: 121. Duplicates found: 0. There are no conflicting event/user roles currently in the database.

### "Mutable" Control Audit
Searched the entire UI source codebase (`app/`, `components/`) and schema for any "Mutable" organizer-facing property. 
**Result**: No `Mutable` property/column exists in the UI or Prisma schema. Mentions of "mutable" in the codebase only refer to internal comments about data being "immutable" (e.g. `Cache-Control` headers) or product spec documentation.

## Pending Phases
- **R0**: Completed (Baseline Audit & Checkpoint)
- **R1**: Apply acceptance patch and regenerate real sessions
- **R2**: Event/resource authorization and review-write integrity
- **R3**: Safe seed/restart and offline baseline
- **R4**: Memberships and event proposals
- **R5**: Configuration updates (Tracks/no-tracks, weights, dates)
- **R6**: Readiness, retry, and stage recovery
- **R7**: Calculation and finalization correctness
- **R8**: My Events and participant workspaces
- **R9**: Guided organizer, admin, and results UX
- **R10**: Verify, document, and prepare release
