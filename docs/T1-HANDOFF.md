# Stage 6 Handoff (T1 → T2)

This document details the current state of the repository as verified by direct inspection at the conclusion of Stage 6, prior to beginning T2 authentication/authorization work.

## 1. Environment & Stack
*   **Framework:** Next.js `16.3.6` (App Router)
*   **Runtime:** Node (v22-alpine in Docker)
*   **Package Manager:** `npm` (v10+ via `npm ci --legacy-peer-deps` due to peer dependency mismatches)
*   **ORM:** Prisma v7 (`@prisma/client` and `@prisma/adapter-pg` version `7.10.0`)
*   **Database:** PostgreSQL (`pg` `8.23.0`)
*   **Authentication:** Better Auth (`1.7.6`)

## 2. Routing and Navigation
*   **Visitor/Public:**
    *   `/` - Home page
    *   `/events/[eventId]` - Event details
    *   `/events/[eventId]/projects` - Public gallery of projects
    *   `/events/[eventId]/projects/[projectId]` - Individual project view
*   **Participant:**
    *   `/dashboard` - Participant dashboard
    *   `/organizer-access` - Form to request organizer access
    *   `/events/[eventId]/team` - Team management
    *   `/events/[eventId]/team/project` - Project draft/submission form
    *   `/invite/[token]` - Team invite acceptance
*   **Judge:**
    *   `/dashboard/judging` - Judging dashboard (currently incorrectly accessible by participants)
    *   `/events/[eventId]/judge` - Event-specific judging view
    *   `/judge-invitations/[token]` - Judge invite acceptance
*   **Organizer:**
    *   `/organizer` - Organizer dashboard
    *   `/organizer/events/new` - Event creation
    *   `/organizer/events/[eventId]` - Event management
*   **Admin:**
    *   `/admin` - Admin dashboard
    *   `/admin/organizer-requests` - Review organizer requests

## 3. Data Models and Schema
*   **Schema Path:** `prisma/schema.prisma`
*   **Migration History:** 4 migrations located in `prisma/migrations/`. Include base `init`, `add_event_timezone`, `add_organizer_requests`, and `stage5d_judge_provisioning`.
*   **Key Models:**
    *   `User`: Global platform users, configured with `isPlatformAdmin` and `canCreateEvents`.
    *   `Event`: Core event entity with dates, timezone, and visibility (`DRAFT`, `PUBLIC`).
    *   `Project`: Team submissions, unified model for drafts and finals.
    *   `EventRole`: Manages relationship between User and Event (roles: `PARTICIPANT`, `JUDGE`, `ORGANIZER`).
    *   `AssessmentCredential`: Secures judging access to specific tracks via `tokenHash`.
*   **Key Unique Constraints:**
    *   `User`: `@@unique([email])`
    *   `EventRole`: `@@unique([eventId, userId, role])`
    *   `Track`: `@@unique([id, eventId])`

## 4. Authentication and Authorization
*   **Entry Points:** `lib/auth.ts` configures Better Auth with Prisma adapter and Email/Password enabled. Route handlers reside in `app/api/auth/[...all]/route.ts`.
*   **Server Helpers:** `lib/session.ts` exports `getSession`, `requirePlatformAdmin` (checks `isPlatformAdmin` on `User`), and `getUserEventRole`.
*   **Status:** While `requirePlatformAdmin` works, fine-grained event role checks (T2) are noticeably missing from most critical routes.

## 5. Organizer & Judge Flows
*   **Organizer Request Flow:**
    *   Users submit requests via `/organizer-access` to `/api/organizer-access-requests`.
    *   Requests enter `PENDING` state and admins review them at `/admin/organizer-requests` (calling `/api/admin/organizer-access-requests/[id]/decision`).
    *   Approval sets `canCreateEvents = true` on the `User`.
*   **Judge Flow:**
    *   Organizers invite judges, creating an `EventJudgeAccess` and `AssessmentCredential`.
    *   Judges click email tokens to hit `/judge-invitations/[token]`, finalizing access via `/api/judge-invitations/[token]/accept`.
    *   *Limitations:* The flow completes, but strict view protections for peers are currently absent.

## 6. Event Configuration & Submissions
*   **Dates & Deadlines:** Events have `submissionsOpenAt` and `submissionsCloseAt`.
*   **Enforcement:** Submissions POSTed to `/api/submit` (or via frontend forms) enforce deadlines. A 400 error is returned when submitting to a closed event.
*   **Uploads:** Managed via `/api/upload` storing local files.
*   **Drafts/Finals:** Kept unified in the `Project` model, differentiated by completion status.
*   **Gallery:** Public projects are visible at `/events/[eventId]/projects` without authentication (T1 validated).

## 7. Fixtures & Seeding
*   **Seed Entry:** `scripts/seed.ts` imports data from `docs/official/fixtures.json`.
*   **Idempotency:** Seed is idempotent. It uses `upsert` and unique checks (e.g. checking existing emails/slugs) to avoid duplicates across container restarts.
*   **Data Integrity:** Original UUIDs and IDs are maintained for compatibility with the assessment checker. Existing test users (`judge_a`, `judge_b`, `org_a`, `admin`) are preserved.

## 8. Docker and Persistence
*   **Services:** `docker-compose.yml` defines `db` (Postgres 16-alpine) and `app` (Node Next.js container).
*   **Initialization:** The Next.js `Dockerfile` sets up a `start.sh` entrypoint that waits for DB, runs `npx prisma migrate deploy`, and executes `npm run db:seed`.
*   **Volumes:**
    *   `dogfoodhack_pgdata` mounts to `/var/lib/postgresql/data`.
    *   `dogfoodhack_uploads` mounts to `/app/uploads` (chowned by Node user).
*   **Ports:** `127.0.0.1:3000` mapped to host for secure local browser testing.

## 9. Verification & `.dogfood.toml`
*   **Config Generation:** `scripts/generate-assessment-config.ts` pulls live tokens from the database to create `.dogfood.toml`.
*   **Execution:** Run locally against docker using `python docs/official/run.py .dogfood.toml`.
*   **Mechanism:** It mimics real browser interactions, using generated auth tokens for specific seeded users.

## 10. Tests and Progress (T1 vs T2)
*   **Executed Check:** `python docs/official/run.py .dogfood.toml` (Output logged as `acceptance-report.txt`).
*   **T1 Results:** All passing (Public gallery, Fixtures visible, Closed event rejects submissions).
*   **T2 Results (Known Failures preserved for next step):**
    *   `judge sees own scores` - PASS
    *   `judge cannot see peer scores` - FAIL (Route returned 200, wanted 401/403)
    *   `participant blocked` from judging - FAIL (Route returned 200, wanted 401/403)
    *   `csv export works` - FAIL (404)
*   **Code Quality:** `npm run typecheck ; npm run lint` executed. Returned 135 typing errors/warnings (`any` and unused variables) left as technical debt.

## 11. UI Tokens & Aesthetics
*   **Design Tokens:** The system uses shadcn UI and Tailwind CSS (`tailwind.config.ts`, `app/globals.css`).
*   **Components:** Reside in `components/ui/` (e.g., buttons, dialogs, inputs).
*   **Aesthetics:** Dark mode, vibrant interactive states, and Space Grotesk/Inter fonts apply across the workspace.

## 12. Safe Checkpoint Recommendation
*   **Status:** All uncommitted changes were committed or discarded. The environment is completely stable.
*   **Recommendation:** This is the ideal checkpoint to branch off and begin Stage 7 (T2). Next work should exclusively focus on introducing Next.js middleware, strict layout guards in `/dashboard/judging`, and securing `/api/export.csv`.

---
*Ready for T2 Implementation.*
