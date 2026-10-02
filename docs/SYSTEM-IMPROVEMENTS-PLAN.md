# DOGFOOD — current-system corrections, acceptance repair and Antigravity implementation plan

Reviewed 2 October 2026 against `tinubaby006/kryPsis-dogfood`, commit `a03c167867c4c73813cebac0fc28da6cbd8227c4`.

## 1. Outcome and how to use this package

Your product improvement document identifies real problems in the current repository. Its direction is sound. The implementation should begin with authentication/acceptance repair, event isolation and safe recovery, then introduce the new event-proposal model and event-first navigation.

I downloaded the repository and inspected the schema, authentication, assessment generator, relevant actions/routes, judging assignment/calculation code, seed, Docker files and organizer/judge/admin interfaces. I read the entire attached product plan. This is a source review, not a browser usability inspection or a production security certification.

I prepared a small code patch for the acceptance integration and ten regression tests. The larger product improvements below are a staged implementation plan, not changes already made to your GitHub repository. Nothing was pushed remotely.

Package contents:

- `DOGFOOD_System_Improvements_Plan.md`: this review and the complete sequence of prompts.
- `DOGFOOD_Acceptance_Fix.patch`: code changes against the reviewed commit, including tests and their missing dependency.

Keep Next.js, TypeScript, PostgreSQL, Prisma, Better Auth and the current Tailwind/shadcn design system. Keep the black/red direction. Database/auth/assets remain local for offline use. Preserve fixture IDs, dates, duplicate records and historical reviews. Do not reset your database to implement this plan.

The new proposal-approval workflow and one-role-per-event rule are **your updated product decisions**. Earlier plans used a global event-creation capability and allowed several event roles. This document explicitly supersedes those decisions for future behavior; migration must preserve existing legitimate events and judging evidence.

Do not call the whole system verified simply because an AI-generated status file says “completed.” In this repository `docs/T2-STATUS.md` claims tests and guarantees that the checked-in implementation does not establish. Update status using executable evidence.

## 2. The two failing tests: what is known

Both failed requests return **401**, before the judge-score query or CSV generation succeeds:

- `/api/judge/scores`
- `/organizer/events/evt_01/exports?type=results&stageId=evt01_stage_1`

Both handlers call `getSession()`, and return 401 if it supplies no authenticated user. `lib/session.ts` uses Better Auth's session API with incoming request headers. The Python checker does not use your browser's logged-in session: it sends the header stored in `.dogfood.toml`.

The checked-in `.dogfood.toml` contains literal signed session cookies. These are tied to the issuing application's authentication configuration and database session records. They can fail after expiration, a database change/reset, or an authentication-secret change. **The exact cause on your laptop cannot be determined from the report alone.** The report proves that those requests were not recognized as authenticated by the app.

The original `scripts/generate-assessment-config.ts` has additional concrete defects:

1. Deletes an account by email before signing it up again, swallowing deletion errors.
2. Does not reliably fail when signup/authentication fails.
3. Returns `dummy` tokens on failure and still writes the configuration.
4. Creates the assessment organizer as a platform administrator, so successful export would not prove ordinary organizer authorization.
5. Creates new test judges rather than using fixture judges with real imported scores.
6. Creates a placeholder stage to obtain a results CSV, although it has no actual judging evidence/results.
7. Omits `[tiers]`, explaining **“claimed: nothing.”** This is separate from the 401 failures.
8. Hardcodes one origin, rather than validating against the app instance you intend to test.

The score route also checks whether the user is a judge **anywhere**, then queries assignments across events. That is a separate authorization defect, not the reason for the observed 401.

### Why the passing denial tests are not sufficient

If all four cookie headers are invalid, the checker can still report PASS for “peer blocked” and “participant blocked,” because it accepts 401 or403 for those checks. Once authentication works, test the same requests using **valid authenticated identities**. Judge A must get200 for A's scores; judge B must get403 for that exact resource; participant must get403. An unrelated organizer must also be denied event-specific exports.

The current closed-event probe is a hardcoded `/api/submit` handler that checks the fixture date and otherwise returns success without creating a submission or authenticating a participant. Its PASS is not proof that the real submission/edit workflow is correct. Integrate that probe with the real submission service in phase R2; preserve the existing T1 deadline behavior.

## 3. What the included patch does

The patch deliberately addresses a small reviewable portion of the system:

| File | Change |
|---|---|
| `scripts/generate-assessment-config.ts` | Signs in existing fixture judges and a fixture participant through the running app; uses a dedicated ordinary organizer with only an event ORGANIZER membership; never deletes users, resets passwords or grants admin. Verifies issued sessions, checks permissions, and writes TOML only after successful preflight. |
| `app/api/judge/scores/route.ts` | Removes session/header logging; checks current event JUDGE membership; supports explicit `eventId`; filters live assignments to active stage memberships; returns the authenticated judge's historical reviews separately. Peer requests remain forbidden. |
| `app/organizer/events/[eventId]/exports/route.ts` | Adds an authorized `historical_reviews` CSV containing actual fixture criterion evidence, with stable ordering, quoting and no-store headers; keeps existing stage exports. No pretend stage is needed. |
| `tests/acceptance-routes.test.ts` | Ten tests covering authenticated access, denial, event filtering, historical CSV and stage export requirements. |
| `vitest.config.ts`, package files | Adds the test configuration and Vite dependency required by the installed Vitest version. |

The generator defaults its tier claim to T1 while the wider defects remain under repair. Set `DOGFOOD_CLAIMED_TIERS=T1,T2` when you have completed and verified the T2 requirements. Changing the claim does not fix authentication or implement features.

This patch uses normal Better Auth login cookies, not a custom role header or an acceptance-only authorization bypass. It validates fresh sessions against `/api/auth/get-session` before it writes credentials. It does not print those credentials. You must rerun the generator after session expiration or relevant environment/database changes.

It creates or reuses `assessment_organizer@dogfood.local` with only an organizer role on `evt_01`. Default demo password is `dogfood_local_dev`, matching the fixture seed's declared password; `DOGFOOD_DEMO_PASSWORD` can override it. If seeded passwords differ, the generator fails clearly. It never silently rewrites them.

### What was actually verified here

- Installed locked dependencies, generated the Prisma client, and read the installed Next.js API guidance required by AGENTS.md.
- `npm run typecheck`: passed after Prisma generation.
- Separate TypeScript check of the assessment script: passed. This matters because your main tsconfig excludes `scripts`.
- `npm exec vitest run`: **10 tests passed**.
- These tests invoke real route handlers with mocked database/session boundaries. They verify handler behavior, not a live Better Auth/PostgreSQL deployment.
- I did not run your Windows application, your database, the official checker against it, or a complete Docker offline boot. A regenerated local report is still required. No acceptance report has been fabricated.

### Apply the patch on Windows

1. Download/extract the package outside your project. Copy the `.patch` file into your project root.
2. Open PowerShell in your project. Checkpoint any local work before applying it. Do not commit `.env`, database backups or private session credentials.
3. Run:

```powershell
Set-Location 'E:\Next.js Challenge\Hackathons\dogfoodhack'
git status
git rev-parse HEAD
git apply --check .\DOGFOOD_Acceptance_Fix.patch
git apply .\DOGFOOD_Acceptance_Fix.patch
npm ci --legacy-peer-deps
npm run db:generate
npm run typecheck
npx vitest run
```

If `git apply --check` fails, **stop applying the patch**. Your branch/local modifications differ from the reviewed commit. Give Antigravity the patch and R1 prompt to merge the intent into current files. Do not force overwrite or reset your branch. If you already have Vitest configuration, merge it instead of creating a competing configuration.

4. Keep your existing local database. Start the app in your usual development terminal:

```powershell
npm run dev
```

5. In a second terminal in the project root, point the generator to the app instance and run it:

```powershell
$env:DOGFOOD_BASE_URL = 'http://127.0.0.1:3000'
npm run assessment:config
python docs/official/run.py .dogfood.toml
```

Your `.env` DATABASE_URL must identify the **same database** used by the running app. Your package script already loads `.env`. Do not start two app instances on different ports/databases and generate credentials against the wrong one. If your existing accounts use a changed demo password, set `DOGFOOD_DEMO_PASSWORD` locally before running the generator; do not paste it into a chat.

6. The generator performs more checks than the official runner: own score data present, judge A can access the peer-target URL identifying A, authenticated B gets403, participant gets403, non-admin organizer gets real CSV, and judge gets403 on that export. It fails instead of replacing TOML if preflight fails.
7. After all planned T2 repairs and verification, use:

```powershell
$env:DOGFOOD_CLAIMED_TIERS = 'T1,T2'
npm run assessment:config
python docs/official/run.py .dogfood.toml
```

To save checker stdout as UTF-8 reliably across PowerShell versions:

```powershell
python -c "import pathlib,subprocess,sys; r=subprocess.run([sys.executable,'docs/official/run.py','.dogfood.toml'],capture_output=True,text=True); pathlib.Path('acceptance-report.txt').write_text(r.stdout,encoding='utf-8'); print(r.stdout); print(r.stderr,file=sys.stderr)"
```

Read the PASS/FAIL lines and verified-tier line; the runner can exit zero with failures. Preserve the runner unmodified.

**Docker caution grounded in this repository:** the seed currently deletes the demo stage's rubric every time it runs. Do not repeatedly rebuild/restart against valuable existing demo judging data until R3 fixes this. For a Docker-only workflow, R3 should make boot safe first; then rebuild the app, run `docker compose exec app npm run assessment:config`, and copy `/app/.dogfood.toml` back using `docker compose cp app:/app/.dogfood.toml ./.dogfood.toml`. That path exists in the current Dockerfile; verify it after any container-layout changes. The Windows host and app container must use the same externally reachable base URL for the checker.

## 4. Verified review of the product requirements

| Your requirement | Repository finding | Implementation decision |
|---|---|---|
| P0.1/P0.4 event roles, one role per event | EventRole uniqueness currently includes role, allowing several roles for one event/user. Team creation/invite acceptance can add PARTICIPANT even to a judge/organizer. | Enforce unique `(eventId,userId)` after an explicit conflict audit; update every membership writer and permission reader. |
| P0.2/P5 My Events | `app/dashboard/page.tsx` selects admin, then organizer, then judge, then home. | Replace with a membership-based dashboard and explicit event workspace selection. Preserve separate platform admin navigation. |
| P0.3 event proposals | `app/actions/events.ts` requires `canCreateEvents`; admin screens grant that capability. | Introduce proposal approval tied to one event; deprecate capability workflows without deleting history or legitimate event roles. |
| P0.5 judging isolation | Score route is global; assignment authorization does not compare the assignment stage's event with the requested event. | Shared resource-based authorization; stage belongs to authorized event before any read/write. |
| P1.1 no-track events | Event has no mode field; judge invite UI and API require at least one track. | Persist SINGLE_POOL/MULTI_TRACK; conditionally validate everywhere. |
| P1.2 overall separate | StageScope already has EVENT/TRACK/OVERALL. | Reuse it; do not create an Overall Track or invent a second engine. |
| P1.3 dates | Native datetime-local exists; form sends timezone-less strings to server `new Date`. | Fix timezone semantics and accessible controls; visual defect needs browser verification. |
| P1.4 weights | UI exposes `weightBasisPts` and totals10000. | Display percentages totaling100; convert exactly to existing basis-point storage. |
| P1.5 Mutable | No organizer-facing `Mutable` field/string was found in reviewed app source. | Do not remove unknown schema fields. Inspect local running UI/screenshots to locate it; replace only if it exists in your later local version. |
| P2 recovery | Snapshot/start action moves to ASSIGNING before preview; editor only permits DRAFT/CONFIGURED. | Preview before transition; revision/transaction-safe commit; recovery for unused stuck stages. |
| P3 guided setup | Organizer sections exist but stage/configuration dependencies are fragmented. | One readiness-driven event workspace, server-derived allowed actions and blockers. |
| P6 admin | Admin page fetches all users, no search/pagination, global capability toggle. | Proposals inbox, bounded users search/filter and completed events. |
| P7 results | Public page is named `PublicLeaderboard`, says Leaderboard, uses `project.name` although schema uses title, and unconditionally claims verified/calibrated. | Implement event Results/awards announcement; remove leaderboard presentation and unsupported assurances. Publish only finalized approved fields. |
| LATER items | Reminders, notifications, profiles deferred; leaderboard prohibited. | Do not add them as dependencies. No global or live leaderboard. |

“No leaderboard” should not remove the ability to publish final event outcomes. Use an event results announcement with winners/awards and project links. Keep the full ranked evidence table organizer-only. If you later want public placements beyond awards, make that an explicit product decision rather than retaining the existing leaderboard by default.

## 5. Additional defects to repair before polish

These were not all listed in your attachment, but they affect its correctness requirements.

### 5.1 Bind authorization to the actual resource

`getAssignmentPreviewAction`, `commitAssignmentAction`, `getCalculationPreviewAction` and `commitCalculationAction` authorize the caller using a supplied eventId, then call a service using a separately supplied stageId. The relevant service must check that stage.eventId equals the authorized event. Otherwise an organizer can potentially supply their own event ID with another event's stage ID. Fix at both action/service boundaries and test direct calls.

`requireJudgeAccess` checks an event role and assignment ownership, but currently does not require `assignment.stage.eventId === resolvedEventId`. It also fails to reject cancelled assignments and does not include finalReview although the draft action checks `assignment.finalReview`. Add the checks; separate permission to read an own submitted review from permission to write while judging is open.

`updateEventConfig` authorizes an event, but updates supplied track/prize IDs without always restricting those IDs to that event. Require resource ownership before every update/delete. Review analogous bulk operations.

### 5.2 The current scoring method diverges from the earlier proposal

`calculateWLS` currently fits a two-way additive model by alternating project/judge means. That can be a valid model when properly specified and converged, but it is **not automatically the earlier overlap-count-weighted pair-difference objective**, especially with unequal review counts. Do not change mathematics invisibly during a UI pass.

Recommended decision: restore the earlier explicitly documented overlap-weighted constrained solve as a **new algorithm version**. Preserve old calculation runs. Before promoting it, test golden inputs and compare fixture results under identical declared rubric assumptions. If you choose to keep alternating minimization instead, document its objective and convergence conditions accurately and verify them. Root JUDGING currently overstates fairness and refers to a “true objective score” that cannot be established from these observations alone.

Other concrete calculation defects:

- `normalizedMean` is clamped before sorting and before computing SD, losing unclamped order and using the wrong SD center in out-of-range cases.
- The project population comes from completed reviews; zero-review stage projects disappear instead of appearing incomplete.
- Disconnected evidence falls back to raw means; commit stores SUCCESS, and finalization does not check support status robustly.
- Finalization only counts PENDING assignments, not exactly R distinct included completed reviews for every stage project.
- Tie policy differs from the earlier SHA-256 policy; choose/version one explicitly. Recommended preserve the earlier hash policy for the new calculation version.
- Preview calculations use a global Prisma client from inside a transaction, so the comment claiming consistent transaction reads is not sufficient.
- Finalization hash covers a short list of project means, while snapshotData only contains runId/count. It is not the full evidence snapshot promised in prior design.

Repair these in R7 before improving the results presentation. Do not recompute/overwrite finalized historical outputs silently.

### 5.3 Assignment and review invariants

The assignment code supplies a capacity derived from N/R/J rather than reliably enforcing each StageJudge.capacity. Greedy choices alone do not prove exact workload parity. Dropout replacement reuses the old runId and lacks comprehensive capacity/conflict/overlap checks. Correct these during recovery work.

Review submission validates expected criteria but then inserts every client-supplied criterion key. Reject extra keys and foreign rubric criteria. Require finite integer scores for the current integer schema. Recheck stage state/deadline/assignment status inside the commit transaction so a concurrent close or cancellation cannot admit a stale write. Reject a new draft after final submission using a real final-review query.

### 5.4 Seed, local configuration and restart safety

`seed.ts` deletes demo RubricVersion rows on every run; submitted StageReview records may prevent deletion or make intended restart behavior unsafe. Seed creates demo_judge without a credential account or event JUDGE role even though it creates StageJudge. Make the demo usable through ordinary login and permissions, without fabricating completed evidence.

The seed also upserts imported review values and project fields on each run; distinguish immutable first import from routine boot. Later organizer decisions should not be undone by restart. Fixture hash changes should be an explicit new import, not a silent overwrite.

Docker startup currently prints DATABASE_URL, lacks a fail-fast shell setting and may proceed after migration/seed errors. Remove connection-string logging and use `set -eu` with readiness/health behavior. The fallback connection in `lib/db.ts` differs from Compose's configured database, which can confuse setup. Require explicit matching DATABASE_URL for application/setup rather than concealing mistakes with another database.

The original judge route logs request headers and the session, and live session cookies were committed. The patch removes those logs. Invalidate the old checked-in demo sessions and replace credential publishing with a documented local generation flow. Do not change the authentication secret casually if you intend to preserve all existing sessions.

## 6. Proposed schema and migration policy

Use additive migrations. Preserve current IDs and model relationships. Do not replace Prisma schema wholesale.

### Event membership

Keep `EventRole` if renaming it would create unnecessary churn. Change uniqueness from `(eventId,userId,role)` to `(eventId,userId)`. Keep the role enum PARTICIPANT/JUDGE/ORGANIZER. The platform admin flag remains a separate platform permission, not an event membership role.

Before migrating, produce a report of event/user pairs with multiple roles and linked teams, submissions, judge access, assignments and final reviews. Never resolve conflicts by always choosing the highest privilege. An organizer cannot be silently demoted if they own event operations; a judge with submitted evidence cannot be silently turned into a participant. Resolve real conflicts explicitly with a recorded decision; abort the constraint migration while unresolved rows remain. The reviewed fixture contains no email overlap between judges and team participants, but your live database may have conflicts.

Update all upsert/findUnique selectors, seed, judge confirmation/revocation/reactivation, team creation, team invitation acceptance, event approval, assessment generator and any helper scripts together. Do not keep an old writer capable of reintroducing conflicting rows.

Role change is a dedicated audited workflow, not a dropdown that overwrites a row. Default: no in-event role changes after linked participation or judging evidence; allow a carefully checked change only while unused, preserving identity and audit.

### Event proposals

Recommended separate `EventProposal` model:

- id, applicantUserId, status DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN.
- name, proposedSlug, description, timeZone, tracksMode, event/submission dates, maxTeamSize, and proposal content needed for review.
- revision, submittedAt, reviewedAt, reviewedById, decisionReason.
- approvedEventId optional and unique; creation/update timestamps.

Drafts are private to applicant and admins. Submitted revisions are frozen for review; “edit and resubmit” makes a new revision and invalidates pending decisions. Approval transaction locks/rechecks the proposal revision, verifies SUBMITTED, creates one event from approved data, creates exactly one ORGANIZER membership for the applicant, links approvedEventId and records audit. Repeated approval returns the same event. Approval and applicant withdrawal racing cannot both succeed.

Approved event starts as DRAFT visibility until the organizer publishes event details. Approval and public visibility are different concepts. Avoid granting canCreateEvents as a side effect. Existing events and event-organizer memberships remain valid; existing OrganizerAccessRequest history remains read-only legacy history. Do not reinterpret an old capability grant as approval of an unspecified future event.

### Track mode

Add `Event.tracksMode` enum SINGLE_POOL/MULTI_TRACK. Backfill events with actual tracks to MULTI_TRACK and zero-track events to SINGLE_POOL. If a placeholder track has existing assignments/reviews/projects, do not delete it automatically. Provide an explicit migration decision for that event.

SINGLE_POOL: no required track records; project.trackId null; no judge-track selection; use EVENT stage scope. MULTI_TRACK: defined named tracks, submitted projects in an eligible event track, explicit judge-track grants; TRACK stages require trackId. OVERALL stage has no trackId and an explicit overall candidate/panel policy. Freeze mode changes once projects/assignments/evidence make reinterpretation unsafe.

### Stage recovery metadata

Add a revision integer and, if useful, archivedAt/archivedById/reason. Treat readiness as computed data, not a permanent boolean. Existing StageState enum can remain; ASSIGNING should be a short-lived commit operation, not a screen users become trapped in. A separate stored assignment-attempt record can retain errors without changing the stage's editable setup state.

No assignment/evidence deletion for convenience. An unused stage may be soft-archived if it has no committed run, assignments, draft/final evidence, calculations, or finalization. If evidence exists, create a replacement stage referencing supersedesStageId/reason; retain the original. Draft review content is mutable by its owner; a submitted review is immutable. Assignment cancellation is an audited lifecycle action, not deleting its history.

## 7. Corrected delivery order

| Phase | Work | Why this order |
|---|---|---|
| R0 | Repository checkpoint and data audit | Establish exact branch, local differences and migration risks. |
| R1 | Apply acceptance patch and regenerate real sessions | Establish authenticated baseline now; move your P4 ahead of cosmetic work. |
| R2 | Event/resource authorization and review-write integrity | Prevent cross-event access while later features expand navigation. |
| R3 | Safe seed/restart and offline baseline | Protect evidence before repeated development restarts. |
| R4 | One event membership and proposal approval | Implement the new product access model once. |
| R5 | Tracks/no tracks, dates, percentage weights | Make configuration understandable and consistent. |
| R6 | Readiness, recovery and deterministic assignment constraints | Remove trapped states without weakening evidence integrity. |
| R7 | Calculation/finalization correctness | Ensure results UI is backed by valid calculations. |
| R8 | My Events and event workspaces | Merge overlapping P0.2/P5 work; reuse permissions/readiness. |
| R9 | Guided organizer/admin/results UX | Complete the requested experience without new deferred systems. |
| R10 | Regression, acceptance, offline verification, docs | Release only what is verified. |

If a phase exposes an unrelated defect, record it and decide whether it blocks that phase. Avoid a broad rewrite. Do not add pairwise/adaptive judging simply because method selection appears in a mockup: the reviewed branch has a RUBRIC engine and no implemented pairwise engine. Show only working modes, or label unavailable modes without allowing configuration.

## 8. Antigravity prompts

Use the current T2 chat if it still has coherent context, but make it read these files and the current code. For a long/conflicting conversation, first ask it to write an accurate `docs/CURRENT-SYSTEM-HANDOFF.md`, then use a fresh chat in the same repository. Never run two chats editing the same files simultaneously.

Save the attached product requirements as `docs/SYSTEM-IMPROVEMENTS-REQUIREMENTS.md` and this plan as `docs/SYSTEM-IMPROVEMENTS-PLAN.md`. Preserve prior proposals as history. Root documentation must describe implemented behavior, not aspirational features.

### Starting prompt

```text
We are improving the existing DOGFOOD application after T2 implementation.
Read AGENTS.md, docs/SYSTEM-IMPROVEMENTS-REQUIREMENTS.md and
 docs/SYSTEM-IMPROVEMENTS-PLAN.md, then inspect actual code. The reviewed baseline
is commit a03c167867c4c73813cebac0fc28da6cbd8227c4; identify subsequent local changes.
Keep the current Next.js/TS/PostgreSQL/Prisma/Better Auth/Tailwind stack and local
self-hosted runtime. Read installed Next.js guidance before using its APIs.
New product decisions: exactly one role per user/event; a separate event proposal
approval grants organizer membership only on that event; My Events is the entry
workspace; no-track events are first-class; no leaderboard. These supersede older
global organizer-capability and multiple-role plans. Preserve existing data/history.
Do not reset DB, overwrite migrations, weaken auth, fabricate acceptance reports,
add cloud services, or claim a feature works based on old status text.
Execute one requested phase at a time, make its checks pass, update
 docs/SYSTEM-IMPROVEMENTS-STATUS.md with actual evidence and report changed paths.
Begin R0 only. Do not implement every phase in one pass.
```

### R0 — baseline and protection

```text
Execute R0. Inspect actual git status/commit, installed versions, existing routes,
Prisma schema/migrations, seed, auth, stage actions and local Compose configuration.
Read the supplied product requirements in full and compare with this review.
Create docs/CURRENT-SYSTEM-HANDOFF.md and an implementation map of affected files.
Do not print secrets, cookies, password hashes or connection strings.
Record current checks honestly. Main tsconfig excludes scripts, so include a
separate check for setup scripts when changing them. Inspect the claimed test
suite: do not repeat unverified claims from T2-STATUS.md.
Prepare a database backup and restore procedure using actual service/user names.
Audit duplicate EventRole event/user memberships and linked evidence before any
unique-constraint migration. Report counts/IDs without leaking private data.
Identify any local Mutable control not found in the reviewed commit.
Checkpoint current work and define pending phases. Do not reset or seed over data.
```

### R1 — acceptance credentials and score/export integration

```text
Execute R1. Review DOGFOOD_Acceptance_Fix.patch against current files; apply it or
merge its intent if the baseline differs. Never use git reset or force overwrite.
Replace destructive assessment signup/delete logic with authentic local sign-in,
non-admin event organizer, fixture judges/participant and fail-fast preflight.
Use the running application's session issuer. Verify the app/script database IDs
match. Never create dummy tokens, bypass auth or promote the organizer to admin.
Regenerate .dogfood.toml with real resource URLs and explicit honest tiers.
Return real own historical/new scores under current event permissions, and export
real criterion evidence using the new historical_reviews export. Preserve existing
stage exports. Do not create fake scores, completed stages or filler CSV content.
Run ten patch tests, typecheck and script-specific typecheck. Run the unmodified
Python checker on the actual local app. Check authenticated A->A=200, B->A=403,
participant->scores=403 and ordinary organizer->CSV=200. Verify CSV rows/content,
not just a comma. Record exact failures if any. Invalidate old committed demo
sessions and remove credential logging. Do not claim all T2 defects are solved.
```

### R2 — event isolation and final-review integrity

```text
Execute R2. Introduce/reuse shared server guards binding current identity to the
actual resource event. Audit every action/route accepting eventId plus stageId,
assignmentId, trackId, prizeId, projectId or calculationRunId. Load ownership and
verify all relationships before reads/writes; an organizer in A cannot use A's
permission to act on B's resource. Apply guards inside services where called directly.
Fix preview/commit assignment and calculation actions, updateEventConfig, and
requireJudgeAccess. Reject cancelled assignments and inactive/revoked access.
Separate read-own-submitted-review permission from write permission requiring an
open stage and valid judging time. Return 401 for missing authentication and 403
for authenticated disallowed API callers; don't redirect APIs to login HTML.
Fix draft-after-final checking by querying the actual final review. Reject extra,
foreign, missing, non-finite and non-integer criterion values against frozen rubric.
Recheck assignment/state/deadline/evidence in commit transaction; make repeat final
submission idempotent only for identical payloads. Test concurrent close/submit.
Replace the hardcoded /api/submit probe with a thin adapter to the real submission
service and event auth/deadline rules, preserving the checker contract and T1.
Add direct-action/API cross-event tests; do not rely on UI hiding. Update status.
```

### R3 — seed and offline restart safety

```text
Execute R3 before repeatedly restarting populated Docker environments.
Make fixture import and demo seed non-destructive and idempotent. Never delete
rubric versions referenced by reviews. Do not rewrite organizer changes/evidence
on routine boot. Import hashes identify versions; do not mark success before the
transaction commits. Repair demo judge login/event membership without inventing
completed reviews. Keep all 41 fixture project records and 126 historical reviews.
Remove database URL/session logging. Make startup fail fast if migrations or seed
fail; health should only pass when usable. Align DATABASE_URL between app and
setup script; explain host localhost versus container db hostname.
Verify migration on existing data, fresh seed and restart after a real submitted
review on a disposable database. Preserve my main database and uploads.
Keep all required runtime dependencies local; no remote fonts/auth/DB/mail services.
Document image provisioning and offline runtime separately. Do not claim a cold
fully offline build succeeds unless its images/dependencies are supplied.
```

### R4 — memberships and event proposals

```text
Execute R4. Follow the migration policy in SYSTEM-IMPROVEMENTS-PLAN.md.
Audit/resolve existing conflicting event/user roles explicitly; never pick highest
role automatically or delete evidence. Add unique(eventId,userId) only once clean.
Update all role selectors/writers, seed, team creation/join, judge invitation,
confirmation/revocation/reactivation, authorization and assessment setup together.
Keep isPlatformAdmin separate. Block participant/judge/organizer conflicts within
one event; allow different roles across events. Handle concurrent invites/team join.
Add EventProposal with revisioned DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN states,
applicant-owned editing, admin-only decisions and decision reasons. Approval must
atomically create one DRAFT-visible event, grant applicant its ORGANIZER membership,
link approvedEventId and write audit. Retry returns same event. Guard stale revision
and approval/withdraw races. No global canCreateEvents grant as a side effect.
Preserve old approved events/organizer roles and old request history. Disable old
capability-based event creation paths, including direct API/server actions.
Test any logged-in user's proposal, rejection/resubmission, no preapproval event
management, repeated/concurrent approvals, same user with A judge/B organizer/C
participant, and unchanged fixture import. Update schema/docs/status.
```

### R5 — configuration people can understand

```text
Execute R5. Add persisted SINGLE_POOL/MULTI_TRACK mode, with conservative backfill
and guards on mode changes after referenced data exists. No placeholder tracks.
SINGLE_POOL allows trackId=null and judge invitations with no tracks; MULTI_TRACK
requires selected valid same-event tracks. Update invitation create/accept/confirm/
reactivate and project/stage validation consistently. OVERALL remains StageScope,
not a Track. Unsupported overall candidate workflows must be visibly unavailable.
Show weights as 0..100 percent with total100/100, while preserving integer basis
points internally. Convert 25%=2500 and 12.5%=1250 exactly. Reject excessive decimal
precision and invalid totals on server; don't silently round/renormalize. Require
valid integer maxima, unique criterion keys and integer R. No edits after freeze.
Fix date controls and semantics: labeled inputs, timezone shown/selected, valid
local-to-UTC conversion, preserved instants on edit, invalid-date/range messages.
Do not parse timezone-less local input as server-local time. Test IST and a DST zone.
Locate Mutable in actual running code before removal; no such organizer property
was found in reviewed source. If internal metadata, hide it; retain freeze behavior.
Test complete zero-track event and a multi-track event end to end. Update status.
```

### R6 — readiness, retry and stage recovery

```text
Execute R6. Build a shared read-only stage readiness calculation using current
eligible accepted/active event judges, track grants, conflicts, project population,
R, capacities, rubric and dates. Return structured blockers plus recovery actions.
Validate on edit and before commit; a green UI is not authorization or a guarantee
that a previously feasible stage remains feasible. Explain N/J/R and per-project
eligibility failures without silently reducing R.
Preview without committing ASSIGNING/frozen snapshots. Commit recomputes with a
consistent transaction/revision guard, creates immutable run/assignments and opens
only on success. Concurrent commits create one logical result; stale preview is409.
Repair existing stuck ASSIGNING stages only when no committed run/assignment/draft/
review/calculation/finalization exists. Return to editable setup, audit and refresh
population from current event memberships. Adding a judge must affect next preview.
Expose Edit, Retry, Return to configuration, Archive unused stage, Create replacement
according to server-computed allowed actions. Never cascade-delete evidence.
Enforce actual capacity, distinct R, event/track eligibility, conflict checks and
configured parity/connectivity. Dropout preserves completed reviews and creates
an audited new run for replacements; fail clearly if constraints cannot coexist.
Test R3/J2 failure -> add valid judge -> R3/J3 success, page refresh, stale hash,
concurrent commits, crash recovery, and refusal to reset a stage containing evidence.
```

### R7 — calculation and finalization correctness

```text
Execute R7. First record an explicit algorithm decision. Recommended: implement
previously agreed overlap-count weighted constrained WLS as a new version, preserving
old runs. Current alternating minimization is not silently equivalent with uneven
review counts. Keep root JUDGING accurate about the implemented objective/limits.
Use all StageProject rows to detect incomplete evidence. Normal completion requires
R distinct included final reviews per project; missing review is never zero.
Disconnected multi-judge calibration returns unsupported, not a publishable raw-mean
fallback. Validate finite solutions, residual and convergence; J1/R1 policy explicit.
Preserve unclamped normalized mean for rank and SD; clamp/round only displayedMean.
Recompute means from final biases. Implement/document versioned deterministic ties.
Bind calculation to immutable evidence/config/algorithm hashes and reject stale
finalization. Check calculation SUCCESS AND supported status and full completion.
Build a full canonical evidence/config/result snapshot; published output references
that finalization rather than whichever calculation is latest. Keep finalized data
immutable. Do not claim unbiased truth or guaranteed fairness.
Tests: raw score72; bias toy +10/-10 and means70/50; disconnected unsupported;
zero-review project; uneven m; m1 SD null; means101 vs100.5 retain order; ties;
stale run; cancelled assignments; exact R; finalization/publication race.
Update JUDGING, DATA-MODEL and honest status with actual results.
```

### R8 — My Events and participant workspaces

```text
Execute R8 using the corrected membership model. Replace /dashboard's global role
redirect with My Events/My Activity. Show all current-user event memberships, each
with event name, role, dates/timezone, event status, real pending work and one next
action. Show own submitted/draft proposals separately from approved event memberships.
Support A judge/B organizer/C participant simultaneously. An empty dashboard gives
Browse events and Propose event actions. Platform admin gets an Admin link; do not
force admins away from their legitimate event activity.
Reuse current event-specific organizer/judge routes. Add a participant event
workspace with team/invite status, project draft/submitted state, deadline/action
and published outcomes. No global role identity. Use bounded server queries and
indexes, not fetching every project's private reviews into the browser.
Add event switcher/breadcrumb/current-role context. Navigation may guide, but every
route/action still enforces server permission. Legacy global pages should lead to
appropriate filtered event lists, not arbitrarily choose a highest role.
Test the same user switching three events, direct deep links, no membership,
pending proposal, expired/revoked judge role and participant after deadline.
```

### R9 — guided organizer, admin and results UX

```text
Execute R9. Preserve the current black/red design direction and working components.
Organizer workspace: Details, Tracks or No Tracks, Judges, Stages, Rubric, Readiness,
Assignments, Progress, Results/Exports. Show current state, completed setup, next
allowed action, exact blockers and what remains editable. Configuration progress
is not judging completion. Readiness and permissions come from server services.
Admin: overview of pending proposals, users and conducted events; searchable,
paginated users with event/role/account filters. Filters for event+role must refer
to the same membership. Show only supported account-status concepts, not invented
statuses. Remove global grant-organizer capability UI after its workflow retires.
Results: distinguish incomplete, unsupported, calculated, finalized and published.
Keep detailed offsets/review tables in organizer evidence/export views. Public
results announce approved event winners/awards and project links, without a live or
global leaderboard. Rename existing Leaderboard UI; use project.title, not name.
Never display 'verified/calibrated' unless the finalized supported calculation
justifies the exact label. Use displayedMean only if public score is configured.
Use responsive tables/cards, accessible labels, keyboard focus, useful empty/error/
loading states and local fonts/assets. Test on desktop and mobile. Do not add the
deferred reminders, notification system, user history or leaderboard.
```

### R10 — verify, document and prepare release

```text
Execute R10. Run the migration/restart/security/workflow/math/UI matrix in the plan,
then typecheck/build and official run.py against the real local app with fresh
non-admin organizer/judge/participant sessions. Verify authenticated denials as
well as happy paths. Never edit the checker or hand-write PASS output.
Run complete proposal->approval->configure single-pool->invite judges->assign->
review->calculate->finalize->publish flow, then multi-track flow and cross-event
negative tests. Recheck T1 submission deadline/edit/gallery behavior.
Verify offline startup with images provisioned and app/DB/required assets local;
restart after real evidence without data loss. Record actual provisioning conditions.
Update README, ARCHITECTURE, DATA-MODEL, JUDGING, .dogfood.toml generation instructions,
actual acceptance-report and STATUS. Remove unsupported completion/fairness claims.
Document no-track mode, role/proposal changes, recovery rules, test commands and
known limitations. Keep the historical hackathon submission revision separate from
post-submission improvements if applicable. Produce a reviewable release summary;
do not push/deploy/send messages without an explicit request.
```

## 9. Verification matrix for the improvement pass

These are required checks for Antigravity to implement/run locally. The ten patch tests cover only a subset; the rest are not claimed to have passed here.

| Scenario | Expected behavior |
|---|---|
| Old/stale cookie |401; generator produces and verifies fresh real sessions instead of bypassing auth. |
| Valid judge A reads own fixture evidence |200 and A's actual criterion scores. |
| Valid judge B requests A's URL |403 with no A evidence. |
| Logged-in participant on judge API |403; a judge role in another event does not help. |
| Ordinary event organizer export |200, genuine CSV data/columns; isPlatformAdmin remains false. |
| Organizer A supplies event A plus stage B |Denied on preview/commit/calculate/finalize/export; no mutations in B. |
| Judge A supplies assignment from event B |Denied even if identity owns it but supplied context is event A. |
| Track/prize update contains ID from other event |Denied; no cross-event changes. |
| Cancelled or suspended judge assignment |Cannot save draft or final review. |
| Submitted review then draft-save |409; no new draft after final evidence. |
| Extra rubric criterion injected into review |Rejected; exact frozen criterion set enforced. |
| Submit races with close/deadline |Transaction admits no review after the effective close boundary. |
| Same user judge A / organizer B / participant C |All three cards/workspaces available with independent permissions. |
| Same-event team join by judge/organizer |409 conflict; membership and team links unchanged. |
| Concurrent judge acceptance/team join |At most one event role; loser receives recoverable conflict. |
| Unresolved existing multi-role rows |Migration stops with a report, not silent data loss. |
| Authenticated normal user proposes event |Proposal created; no organizer privileges until approval. |
| Pending proposal URL as unrelated user |Denied; unpublished proposal is not a public event. |
| Approve same proposal twice/concurrently |Exactly one event and one organizer membership. |
| Approval races withdrawal/revision update |One valid state transition; stale action rejected. |
| Approval followed by attempting a second direct event create |Requires a new proposal; no permanent creator capability. |
| Legacy approved organizer |Can still manage existing event; historical approvals retained. |
| SINGLE_POOL event with zero tracks |Judge invitations, projects, stage and judging all work without fake track. |
| MULTI_TRACK stage with foreign trackId |Rejected on server. |
| Changing mode with existing judging evidence |Blocked or routed to explicit migration; no reinterpretation. |
| Percentage weights25/25/30/20 |Stored2500/2500/3000/2000, displayed100/100, same raw score math. |
| Percentage12.5 |Stored1250 exactly; invalid precision or totals rejected. |
| Date local10:00 in Asia/Kolkata |Saved instant04:30Z; edit displays10:00 again in selected zone. |
| Invalid date / end before start / DST ambiguity |Clear validation; no NaN dates or silent server-zone shift. |
| R3 with2 eligible judges |Readiness explains shortage; stage remains editable. |
| Add third judge, retry, refresh |New preview uses3 eligible judges; no need to recreate stage. |
| Stuck ASSIGNING with no committed evidence |Recover action safely returns to setup and records audit. |
| Reset/archive stage with committed assignment or review |Denied; replacement stage offered without erasing old records. |
| Stale preview after changing rubric/panel/population |409 and refresh guidance. |
| Concurrent assignment commit |One run/set; no duplicates or split stage state. |
| Dropout after submitted evidence |Completed reviews remain; replacement run covers only unfinished work and obeys constraints. |
| StageProject has zero final reviews |Visible incomplete project, never silently absent from results. |
| Disconnected multi-judge graph |Unsupported final calibration; cannot publish it as calibrated. |
| Unclamped means101 and100.5 |Correct internal order; only display values clamped to100. |
| Finalize without R completed reviews per project |Rejected even if no row happens to have status PENDING. |
| Publish then add unrelated/new calculation |Published page remains tied to its finalized snapshot. |
| Public event results |Approved winner/project/award fields only, no private ballots or leaderboard. |
| Admin event+role filter |Matches role in that event, not role in another event. |
| Restart after real demo review |Same review/rubric IDs and values remain; seed does not delete them. |
| Offline runtime |Login, DB writes, local assets, assignments, reviews and CSV work with external network unavailable. |

## 10. Beginner notes: what to do yourself

1. **Back up first.** Your code is stored in Git; your PostgreSQL records are stored separately. A Git checkpoint does not back up reviews/submissions.
2. **Apply only the acceptance patch first.** It does not require a new schema migration. Do not apply R4's membership constraint by hand before the conflict audit.
3. **Refresh credentials against the running app.** A browser login and Python-runner credentials are separate. Changing `.dogfood.toml` headers to random strings, account IDs or a role name will not authenticate you.
4. **Use one Antigravity phase at a time.** Ask it to demonstrate that phase's gates before proceeding. Continue from its existing code; don't ask it to regenerate a new Next.js app.
5. **Use a separate database for destructive tests.** Tests that create/clear events must not target your main DATABASE_URL.
6. **Keep official fixture data unchanged.** For new approval/configuration demos, create a separate event. The closed sample event stays closed.

For the Compose database names in the reviewed repository, this backup approach avoids PowerShell binary-redirection problems:

```powershell
New-Item -ItemType Directory -Force .\backups
$backupName = 'dogfood-before-improvements-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump'
docker compose exec -T db pg_dump -U dogfood -d dogfood_db -Fc -f "/tmp/$backupName"
docker compose cp "db:/tmp/$backupName" ".\backups\$backupName"
```

Check that the copied file exists and is nonempty. Exclude `backups/` from Git. If your local DB is not the Compose `db` service, have Antigravity adapt the command to the actual installation. Test restoration into a separate disposable database; do not run a destructive restore into your working database casually.

For expired credentials, rerun `npm run assessment:config`. For a failed login, compare the app and script database configuration and demo password. The seed's embedded password hash was independently checked during this review with the installed Better Auth verifier and matches `dogfood_local_dev`; this does not prove your existing database still has that hash. Do not run the old deletion-based generator to fix it.

For an export still returning401, verify `/api/auth/get-session` with the same issued Cookie header before changing CSV code. For403, authentication works and role/event authorization should be investigated. For400, inspect required type/stage parameters. For404, inspect actual event/stage IDs. These responses mean different things.

## 11. Release documents and boundaries

Update these existing documents as work is completed:

- README: local startup, credential generation, My Events, proposals, no-track mode, truthful limits.
- ARCHITECTURE: event-scoped authorization, local runtime, services/transactions and publication boundary.
- DATA-MODEL: membership migration, proposal relationship, tracksMode, stage revision/recovery and historical evidence.
- JUDGING: actual versioned scoring objective, support conditions, completeness, unclamped ranking, ties, assumptions and limitations.
- T2-STATUS / improvement STATUS: actual commands and results; remove unsupported “all complete” claims.
- acceptance-report.txt: real latest runner output for the release being described.
- OFFLINE guide: required images/dependencies, target platform and conditions actually tested.

Treat the current improvement branch as distinct from any already submitted hackathon revision. Do not overwrite an earlier receipt or imply later changes were present in a prior submission. This plan does not assume a deadline extension.

Official references rechecked for this review: [DOGFOOD brief](https://dogfoodhack.com/), [spec/checker contract](https://dogfoodhack.com/spec/). The checker accepts your chosen routes and sends supplied credential headers; it does not log in. Your current proposal/role UX is a product policy layered on top of those constraints.

Repository reference: [reviewed commit](https://github.com/tinubaby006/kryPsis-dogfood/tree/a03c167867c4c73813cebac0fc28da6cbd8227c4).

The acceptance patch passed a dry-run application check against a clean archive of that commit. It is an integration repair with local-runtime verification still required, not a certification that all outstanding T2 security/mathematical issues are resolved.
