# kryPsis Dogfood — reviewed T2 corrections and Antigravity implementation plan

**Reviewed:** 3 October 2026  
**Repository:** https://github.com/tinubaby006/kryPsis-dogfood  
**Reviewed commit:** `fb4a41143f1da55984d51a7871ee4fadb7d80f5d`  
**Inputs read:** all 699 lines of `changes (1).md`, all 1,431 lines of `changes (2).md`, the current implementation, relevant prior decision documents, official fixture/runner/spec files, and the official spec website.

This is a new corrective plan. It supersedes conflicting implementation suggestions in the two attachments; it does not erase their useful observations. It is not a claim that all changes below have already been implemented. No changes were pushed to GitHub during this review.

## 1. The outcome you need to know first

**The exact two acceptance failures were reproduced and then resolved on an isolated fresh PostgreSQL database using the existing repository's session generator. All seven official checks subsequently passed.** Application authorization did not need to be weakened or rewritten to achieve that result.

The checked-in `.dogfood.toml` contains signed Better Auth session cookies and a database-specific judge ID. Those values belong to the database and authentication configuration that issued them. They are not portable installation credentials. On a fresh installation, those sessions do not exist. On an existing installation, expiration, a changed secret, a different database, or an old config can also invalidate them. We have proven the fresh-install failure; the precise reason each teammate's particular session became invalid cannot be established remotely.

The existing `scripts/generate-assessment-config.ts` already performs real HTTP sign-in, checks the user identity against the database, verifies returned sessions, checks role isolation, and writes a fresh config. It must be run against the application and database actually being evaluated. Copying somebody else's generated config cannot replace this step.

**Passing seven checks is necessary but does not prove the whole T2 product works.** In this clean installation, judge A's successful scores response contained one authentic historical review and zero modern assignments. The current fixture dashboards therefore remain incomplete despite a green acceptance report.

### What I actually verified

| Check | Observed result |
|---|---|
| Latest public repository checkout | Commit above |
| Prisma client generation | Passed |
| All seven migrations on an empty PostgreSQL 16.15 database | Passed |
| Fixture seed and a second seed execution | Both completed |
| Existing automated suite | 22 tests passed across 3 files |
| TypeScript `npm run typecheck` | Passed |
| Production `npm run build` | Passed |
| Official runner using checked-in cookies | Exact two reported T2 failures: own scores 401, export 401 |
| Existing generator with fresh real logins | Passed its preflight |
| Official runner against development server | All seven passed |
| Official runner against production server | All seven passed |
| Authenticated judge A, own scores | 200; authentic historical evidence present |
| Judge A requesting the configured A-specific peer URL | 200 |
| Authenticated judge B requesting that same A-specific URL | 403 |
| Authenticated participant requesting judge scores | 403 |
| Ordinary fixture organizer, historical export | 200; 378 criterion data rows |
| Authenticated judge requesting organizer export | 403 |
| Authenticated participant, closed-event submission | 400 with `EVENT_CLOSED` |
| Fresh fixture event | `DRAFT`, `SINGLE_POOL`, 126 legacy reviews, 0 modern stages, 0 judge-access rows |

Environment: isolated local PostgreSQL, local Next.js development and production servers, Node 24.19.0. Installed dependencies were reused from the prior matching project environment; this was not a clean Docker image build. Docker/Windows UI/offline-disconnected execution was not verified here. Existing tests are predominantly mocked guards and pure math tests, not a complete real-database workflow suite. The later phases explicitly close those gaps.

### Genuine production acceptance output

The absolute fixture path is specific to the audit checkout; the behavioral results are from the real runner, not a proposed example.

```text
DOGFOOD 2026 acceptance report
portal: http://127.0.0.1:3000
claimed: T1 T2
fixtures: /workspace/scratch/282e30ebc574/kryPsis-dogfood-oct3/docs/official/fixtures.json

T1  gallery is public ................. PASS
T1  project from fixtures shown ....... PASS
T1  closed event refuses submissions .. PASS
T2  judge sees own scores ............. PASS
T2  judge cannot see peer scores ...... PASS
T2  participant blocked ............... PASS
T2  csv export works .................. PASS

claimed T1 T2, verified T1 T2
```

Do not copy this into your root `acceptance-report.txt` as evidence of your machine. Generate your own report after implementing and testing your final revision.

## 2. Recover your current acceptance test first

A **session** is the server's record that a particular user has logged in. The cookie identifies that session. A **401** means authentication failed. A **403** means the authenticated identity is not permitted to do that operation. Missing organizer membership normally causes 403 here, not the reported 401.

Keep your current database. Do not run `scripts/wipe.ts`, reset migrations, delete users, replace passwords globally, or use `docker compose down -v` to solve this error.

### A. If Next.js runs on Windows and only PostgreSQL runs in Docker

Open PowerShell in the project folder. Your `.env` must point to the same database used by the running application:

```dotenv
DATABASE_URL=postgresql://dogfood:dogfoodpassword@127.0.0.1:5432/dogfood_db?schema=public
BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_SECRET=<keep-your-existing-local-secret>
```

The password/database above match the reviewed Compose file. Do not replace a working secret merely to follow an example. Do not commit real deployment secrets.

If the app is already running correctly, leave it running. Otherwise:

```powershell
docker compose up -d db
npm run db:generate
npm run db:deploy
npm run dev
```

Use another terminal for the commands below. On a genuinely empty database, run `npm run db:seed` before generating credentials. On an existing database, review the seed-repair phase before using repeated seeding as a repair: the current seed still overwrites fixture role rows.

```powershell
$env:DOGFOOD_BASE_URL = "http://127.0.0.1:3000"
$env:DOGFOOD_CLAIMED_TIERS = "T1,T2"
npm run assessment:config
if ($LASTEXITCODE -ne 0) { throw "Session setup failed. Read its error; do not continue with stale credentials." }
python docs/official/run.py .dogfood.toml | Tee-Object -FilePath acceptance-report.txt
```

The tier setting reproduces the currently claimed T1/T2 test run; it is not permission to claim unfinished functionality. Adjust the final submission claim honestly after all release gates.

### B. If both app and database run in Docker Compose

The script must execute inside the running app container so it uses that app's environment/database. In the current image it writes `/app/.dogfood.toml`. Copy that generated file back to the host before running the Python checker:

```powershell
docker compose up -d --build
docker compose exec -e DOGFOOD_BASE_URL=http://127.0.0.1:3000 -e DOGFOOD_CLAIMED_TIERS=T1,T2 app npm run assessment:config
if ($LASTEXITCODE -ne 0) { throw "Session setup failed. Inspect app logs." }
docker compose cp app:/app/.dogfood.toml ./.dogfood.toml
python docs/official/run.py .dogfood.toml | Tee-Object -FilePath acceptance-report.txt
```

`--build` needs provisioning internet unless images/dependencies are already supplied. The final offline procedure appears later. Do not run a host dev server and a Compose app both on port 3000. Use one deployment at a time.

### Read failures correctly

| Symptom | Next action |
|---|---|
| Generator cannot connect | Start app; confirm host/port and only one app owns that port |
| `DATABASE_URL is required` | Supply local `.env` or run in app container |
| Seeded account missing | Check database identity and fixture import; do not create unrelated replacement judges |
| Login fails | Check the documented fixture password or `DOGFOOD_DEMO_PASSWORD`; do not delete accounts |
| App/setup script database mismatch | Correct host `127.0.0.1` versus container `db` database URL |
| Fresh login succeeds but own route 403 | Inspect that user's event role/access; authentication is now working |
| Config generation succeeds but runner still 401 | Check which `.dogfood.toml` Python loaded; copy from container; check you did not restart with another secret/database |
| Negative tests pass while own-score test fails | They may be passing only because all cookies are invalid; verify authenticated denials |

The official runner exits zero even when a check fails. Read its PASS/FAIL lines and verified-tier line. Phase 10 adds a separate wrapper that fails the process on failed checks without changing the official file.

## 3. Review of the team's proposed changes

### Keep these requirements

- Genuine own-score visibility, server-side immutability, event-scoped authorization.
- Modern stage records for the fixture dashboards, with explicit historical provenance.
- Correct `CALCULATED` navigation and direct results access.
- Real, documented normalization instead of fabricated SQL results.
- Single-pool and multi-track judge invitations.
- Public fixture event, reproducible seeds, and ordinary fixture organizer.
- Human-readable CSVs retaining IDs.
- Exactly **two** judges in the organizer dashboard preview and a separate full directory.
- Working Better Auth sign-out and visible proposal navigation.
- Local PostgreSQL and offline runtime; retain the current Next.js stack.

### Correct or reject these suggestions

| Team suggestion/assumption | Reviewed decision |
|---|---|
| Fix 401 by modifying event authorization | First regenerate real sessions. Existing generator fixes the reproduced failures. Keep event authorization strong. |
| `SUBMITTED` is the persisted final assignment status | Current app writes/queries `COMPLETED`. Standardize to `PENDING`, `COMPLETED`, `CANCELLED`; display “Submitted” in UI. Migrate only verified inconsistent records. |
| Run calculation after the SQL import | Imported `SUBMITTED` rows are currently invisible to calculation. Repair status/provenance and validate criteria first. |
| Mock AVG results labelled `WEIGHTED_WLS`/`SUCCESS` | Invalid evidence. Quarantine those specific runs, retain original evidence, recalculate with a versioned real algorithm. |
| Delete all calculation runs/results for the stage | Reject blanket deletion. Preserve history; invalidate only explicitly identified mock runs and any dependent publication. |
| Assign random UUID and version 1 on every migration rerun | Not idempotent: `(stageId, version)` is unique. Use a content-addressed import and deterministic IDs or unique-key upserts. |
| Every missing historical assignment can be reconstructed | Fixture has observed reviews, not a complete planned-assignment manifest. Do not invent missing judge-project pairs. |
| Historical imported completion means a finished live round | False. Mark historical coverage unknown, preserve uneven counts, allow organizer analysis, block live-style finalization/public winner claims for that import. |
| `CURRENT_TIMESTAMP` is original review submission time | Fixture has no review submission timestamps. Store unknown submission time as null and record import time separately. |
| Add `PUBLISHED` to state arrays | Schema has no `PUBLISHED` StageState. Use `FINALIZED` plus an explicit publication/snapshot reference. |
| Missing FinalizationSnapshot is itself why finalization fails | Finalization creates the snapshot. Mock hashes cause a mismatch before that. Do not fabricate a snapshot to bless fake results. |
| `getCalculationPreviewAction` needs `CALCULATED` added to a state allowlist | Latest action has no such allowlist. Dashboard omission is real; the direct page's bigger issues are incorrect evidence and lifecycle controls. |
| Production image is `.next/standalone` | Outdated for this commit. Current Dockerfile copies full `.next` and `node_modules`, then runs `next start`; `lib/` is still absent for scripts importing it. |
| Mount source into production | Reject. Bake required runtime modules into the image. Optional development override may mount source. |
| Restore global organizer grants to make both admin workflows visible | Keep legacy requests visible as historical/migration work; use event proposals for new privileges. Do not revive unlimited event-creation grants. |
| Use 45/50 as every judge's total | Compute actual rubric values. Show criterion values plus weighted score /100; raw sum/max only as a separately labelled value. |
| There are three other passing T2 checks | There are four T2 checks total; two failed and two passed in the supplied report. |

## 4. Remaining code-level problems at the reviewed commit

| Priority | Finding and location | Required outcome |
|---|---|---|
| P0 | Machine-bound cookies and user ID committed in `.dogfood.toml`; config not regenerated by boot | Fresh installation gets valid credentials through explicit local bootstrap |
| P0 | Seed creates fixture `DRAFT`/default `SINGLE_POOL`, no ordinary organizer, no access rows, no modern fixture stage | Reproducible, public, multi-track fixture with complete read-only historical projection |
| P0 | Manual import status `SUBMITTED` versus calculator `COMPLETED` | One canonical persisted status and audited repair |
| P0 | Assignment detail calls `requireJudgeAccess()` with default write access | Read own submitted work after judging closes using explicit read permission |
| P0 | Results link omits `CALCULATED`; results page has no Finalize button and only shows Publish after finalization | Reachable Calculate → Commit → Finalize → Publish flow for live stages |
| P0 | `lib/judging/calculation.ts` implements a different objective than the previously selected pair-overlap model | Adopt explicit new algorithm version, golden tests, truthful documentation |
| P0 | Calculator uses rubric ID as config hash; `method` is stored as `SUCCESS`; latest run selected for public output | Canonical content hashes, actual method name, publication pinned to immutable snapshot |
| P0 | Finalize checks count only pending rows; exact R documented but code permits m > R | Complete/live evidence invariants and historical coverage distinction |
| P1 | `ReviewForm` renders submitted values from initial local state | Render persisted finalReview directly; refresh after submission; never overwrite finals |
| P1 | Judge dashboard does not load criterion scores or totals; includes cancelled assignments without distinct treatment | Own evidence and accurate progress, no peer leakage |
| P1 | `JudgesSection` has no tracksMode prop; PATCH access route still requires tracks | Shared mode-aware validation for create/update/accept/confirm/reactivate |
| P1 | Event settings omit `tracksMode` when passing props into `EditEventDetailsForm` | Do not silently display MULTI_TRACK as SINGLE_POOL or accidentally change it on save |
| P1 | Proposal approval does not copy proposal tracksMode to new event | Persist and propagate selected mode end to end |
| P1 | Organizer page excludes platform admins although several APIs allow them | One shared organizer/admin policy |
| P1 | Public project gallery does not check event visibility; a DRAFT fixture still passed public checks | Require PUBLIC for anonymous event/project browsing; allow separately authorized organizer/admin previews |
| P1 | Draft/final writes, close, revoke and calculation/finalization lack a consistent database serialization contract | Transactional guards plus stage lock order and concurrency tests |
| P1 | Dropout repair uses StageJudge only, no full conflict/capacity/track policy; early no-work return leaves judge active | Safe repair with shared eligibility and audit, preserving submitted work |
| P1 | Assignment tie comparator calls PRNG during sorting; capacity computed but unused | Stable deterministic keys and actual constraint checks |
| P1 | Seed overwrites fixture roles every boot, despite “strictly non-destructive” docs | Preserve deliberate changes/revocations; explicit repair commands |
| P1 | Admin proposals already visible, but old global grant endpoints remain callable | Preserve new proposals; retire old capability mutations consistently |
| P1 | Export mostly IDs; final results can select latest rather than finalized run | Readable, source-labelled, run-bound evidence exports |
| P2 | Long judges list, broken dashboard sign-out, homepage canCreateEvents gate, stale status docs | Exact two-row preview, shared sign-out, proposal entry for logged-in users, truthful docs |

The earlier fixes for event/stage binding, own-score API boundaries, fail-fast startup, preserved demo rubric, single event role uniqueness, and pure math tests are present. Keep them. Do not blindly reapply the previous acceptance patch.

## 5. Binding architectural decisions

These are decisions for implementation, not questions Antigravity should reopen.

### 5.1 Stack and scope

Keep Next.js App Router + TypeScript + PostgreSQL + Prisma + Better Auth + Tailwind/shadcn. A separate backend is unnecessary for this T2 scope. Use Route Handlers for HTTP APIs, server actions for UI mutations, and shared server-only services for authorization, evidence and calculation. Do not add cloud PostgreSQL, Redis, SMTP requirements, OAuth-only login, a second ORM, pairwise judging, notifications, or a new global leaderboard in this pass.

Keep the black/red visual system and local/system fonts. Correct workflows before visual polish. Keep the supplied fixture and runner files unchanged. Treat user-provided permission to prebuild as existing context; do not fabricate dates or reinterpret it as a technical feature.

### 5.2 One authority for event permissions

Create `lib/permissions.ts` with typed errors and these service entry points:

- `requireAuthenticatedUser()` → authenticated identity; no event privilege inferred.
- `requireEventOrganizer(eventId, tx?)` → current event ORGANIZER or current platform admin.
- `requireEventJudge(eventId, tx?)` → JUDGE membership **and ACTIVE EventJudgeAccess for that user/event** after data migration.
- `requireJudgeAssignment(eventId, assignmentId, {mode: 'read'|'write'}, tx?)` → event/stage/project/assignment match, ownership, current judge access, active StageJudge, not cancelled. Write additionally requires LIVE origin, OPEN stage and judging window.

Default an assignment permission request to `read`; write callers must explicitly request `write`. Event-wide historical access still requires current active judge membership. A platform admin does not automatically impersonate a judge; admin/organizer inspection uses separate organizer evidence services.

Return 401 for no valid session, 403 for authenticated disallowed identity, 404 for absent or mismatched resource, 409 for stale/conflicting mutation, 422 for invalid input. Server actions should return structured error codes; HTTP adapters set HTTP status. Do not catch arbitrary exceptions and report all of them as 401.

Do the fixture access backfill before enabling the stricter ACTIVE access requirement. Revoke deletes the effective JUDGE grant, deactivates affected StageJudge rows, and immediately blocks all judge reads/writes; it preserves submitted evidence for organizer calculation. Do not automatically reactivate judges on restart.

### 5.3 Live judging and imported history use the same tables, different provenance

Keep `Review`/`CriterionScore` as immutable original fixture evidence and compatibility export. Create one **canonical read-only historical stage projection** into the modern stage tables. Modern judge/dashboard components read those modern records. Do not create another scoring subsystem.

Historical stage contract:

- Name: `Imported fixture reviews`.
- Deterministic identity from event ID + fixture SHA + projection version, not a teammate's CUID.
- Origin `FIXTURE`; starts `CLOSED`. It can obtain a real `CALCULATED` organizer analysis after phase 5.
- Scope EVENT; preserve all 41 projects, including the duplicate. Preserve all 126 observed reviews and 378 criterion values. Do not silently drop `prj_41` or treat missing reviews as zero.
- Include 30 source judges, 8 tracks and 39 judge-track links. `evt_01` uses MULTI_TRACK because the actual fixture includes track assignments. Overall historical analysis does not invent a future live assignment policy.
- Assignment rows represent observed historical reviews, not proof of a complete scheduled round. All valid imported final reviews use `COMPLETED`.
- Historical expected assignment coverage is **UNKNOWN**. Actual review count distribution: eight projects have 2, twenty-six have 3, three have 4, four have 5.
- No new judge edits, opening for judging, dropout replacement, live-completion percentage, finalization, or public winner publication for this imported stage. Show “126 imported reviews; planned coverage unknown.”
- Real historical normalized results may be calculated and exported for organizers, clearly labelled “historical analysis; not finalized.” Demonstrate live finalization on a separate normal live stage with a known assignment manifest.

This deliberately corrects the request to finalize the manually imported fixture as though it were a completed live round. The fixture does not provide evidence for that claim. It does not prevent full T2 functionality or the official seven checks from passing.

Fixture rubric assumption, explicitly versioned and labelled as an application interpretation:

| Key | Minimum | Maximum | Weight basis points |
|---|---:|---:|---:|
| functionality | 0 | 5 | 3333 |
| quality | 0 | 5 | 3333 |
| innovation | 0 | 5 | 3334 |

The file does not declare rubric maxima/weights; these are not official mandated values. Sum is exactly 10,000. Do not describe these as mathematically exact equal thirds. Reject any source value outside the declared scale instead of silently clamping it. Never change live event weights to match this fixture assumption.

### 5.4 Schema changes and safe migration contract

Implement new migrations; never edit applied migration history or run destructive reset on the current database. The existing `prisma7.config.ts` is discovered by the installed Prisma CLI in this repository and worked in the audit. Do not rename it as a supposed fix for the 401s.

| Model | Concrete change |
|---|---|
| Event | Replace unchecked tracksMode strings with `TracksMode { SINGLE_POOL, MULTI_TRACK }` after invalid-value audit; preserve all existing valid values. Known fixture correction is explicit and audited. |
| EventProposal | Same TracksMode type; create/edit/approval must carry it through. |
| RubricAssignment | Introduce `AssignmentStatus { PENDING, COMPLETED, CANCELLED }`; map `SUBMITTED` only when a matching valid final review exists; halt/report all other unexpected states. |
| JudgingStage | Add `origin RecordSource @default(LIVE)`, `fixtureImportId String? @unique` related to FixtureImport, `archivedAt DateTime?`, and `activeRubricVersionId String?` with a named relation. Add `publishedSnapshotId String?` with a named relation to FinalizationSnapshot. Keep current StageState enum; no PUBLISHED state. |
| RubricVersion | Keep versions immutable after any assignments reference them; stage's explicit activeRubricVersionId replaces “latest createdAt” selection. Named inverse relation resolves Prisma's two stage/rubric relations. |
| StageReview | Add `origin RecordSource @default(LIVE)`, `fixtureImportId String?`, `sourceRecordKey String?`, `importedAt DateTime?`; make `submittedAt` nullable with no implicit import-time substitution. Unique `(fixtureImportId, sourceRecordKey)` for the one canonical import projection. Live code sets submittedAt explicitly. |
| StageReview SQL checks | LIVE requires submittedAt and no fixture source key; FIXTURE requires fixtureImportId/sourceRecordKey/importedAt. Unknown fixture submittedAt remains null. Apply after backfill. |
| StageProject | Add `projectSnapshot Json?`; capture public judging-relevant project content and version at assignment commit. A version number alone does not preserve old content. Existing legacy snapshots with no recoverable historical content must be labelled current/imported content, not falsely frozen historical content. |
| FinalizationSnapshot | Unique stageId for the current terminal-stage design; snapshotData contains complete canonical evidence/config/results/calibrations, not counts alone. Migrate duplicate existing snapshots only after reporting them and resolving an explicit canonical selection. |
| CalculationRun | Keep existing unique `(stageId, configHash, inputHash)`. Include method/implementation version in configHash. Add `invalidatedAt DateTime?`, `invalidationReason String?`. Keep old results; exclude invalidated runs from all normal selectors. |
| FixtureImport | Store the parsed source payload in rawPayload and verified counts, rather than `{}`. Keep original fixture bytes in repo for byte-hash reproducibility. Add named reverse relations for stage/review provenance. |

Avoid unnecessary schema replacement. Existing globally unique IDs and relations stay. Add indexes for assignment `(stageId,status)`, `(judgeUserId,stageId)`, and access `(eventId,userId,status)` if absent. Keep the existing unique assignment `(stageId,projectId,judgeUserId)` and final-review `assignmentId` constraints.

Enforce these invariants in shared transactional services before writes: assignment run belongs to assignment stage; project belongs to stage event; stage project is enrolled; criterion belongs to review's pinned rubric; rubric belongs to stage; published snapshot belongs to that same stage. A project/user ID existing somewhere is insufficient authorization. Do not rely solely on frontend inputs.

Migration sequence:

1. Back up; report unexpected statuses, cross-event links, duplicate finalizations and mock runs.
2. Add nullable columns and new enum types without dropping old data.
3. Backfill normal LIVE provenance; identify known manual imports by matched source evidence, not just a name.
4. Run the explicit import-repair command for known historical stages; uncertain stages remain reported for owner resolution.
5. Validate all rows, then add checks/unique constraints and switch readers/writers.
6. Generate Prisma client and type-check application **and scripts**. Current tsconfig excludes scripts; create a separate `tsconfig.scripts.json` and `typecheck:scripts` command.

### 5.5 Repair the existing manually patched database safely

Add `scripts/repair-fixture-history.ts` with `--dry-run` default and explicit `--apply`. It must be scoped to a selected event and the verified fixture SHA. Output a report with counts and IDs, never auth headers/password hashes.

- Validate all source reviews/scores against the canonical fixture. Preserve original records and manual results as evidence.
- Identify suspicious mock runs from the supplied markers (`configHash/inputHash='migrated'`, method/version, missing calibration evidence and diagnostic mismatch). Mark as candidates; never invalidate unrelated real runs based on a shared method name alone.
- On explicit apply for the reviewed candidates, set invalidation metadata, remove any publication pointer to them, archive the noncanonical manual stage, and create/use the canonical projection. Do not overwrite legitimate live stage evidence.
- Map imported statuses only after finalReview and exact criterion validation. Missing final review is an import error, not a request to invent scores.
- Canonical new sourceRecordKey uses `scores:<zero-based-index>` from the immutable hashed fixture file. Deterministic IDs include event, source SHA, record key and projection version.
- Use upsert by unique content identity, not a new version-1 AssignmentRun on every execution. Re-running after success must create no additional stages, assignments, reviews or results.
- No fake original review timestamp. A manual `submittedAt=NOW()` is not recovered source time. Preserve the old record in archived evidence and use null on the canonical projection.
- Write one structured audit summary. Do not set FINALIZED, create fake snapshots, or silently publish.

Normal boot may fill **missing** seed-owned fixture projection records, but must not use upserts to restore revoked roles or rewrite edited user/event data. Apply changes to existing fixture visibility/mode only through the explicit audited repair. On a fresh database those correct values are created immediately.

### 5.6 Exact math decision, with an independent distinguishing test

Adopt `pair_overlap_wls_v3` as the new algorithm version. The official hackathon does not mandate this specific estimator; this decision preserves the earlier project plan's explicit overlap-count weighted pair-difference objective.

For each completed review, compute:

```text
rawScore = 100 × Σ[(weightBasisPts / 10000) × (value / maxScore)]
```

Validate every required criterion exactly once, correct rubric, finite integer values within min/max, weights sum 10,000, maxScore > 0. Do not skip an unknown/missing criterion and silently reduce the score. Keep zero-based live rubrics for this version; do not imply arbitrary nonzero-min scale normalization without a separately documented version.

For judges j and k sharing projects:

```text
n_jk = number of projects both scored
D_jk = average(rawScore_jp - rawScore_kp) over those projects
minimize Σ(j<k) n_jk × [(b_j - b_k) - D_jk]^2
subject to Σ_j b_j = 0
```

Build the weighted graph Laplacian L and vector q by adding each shared-project pair once. Solve the constrained system:

```text
[L  1] [b] = [q]
[1ᵀ 0] [λ]   [0]
```

Use deterministic Gaussian elimination with partial pivoting for the small panel, sorted judge/project IDs, a documented pivot tolerance, finite-value checks and a residual check. Numerical failure returns `NUMERICAL_FAILURE`; do not declare success after an arbitrary iteration cap.

- Disconnected multi-judge evidence → `UNSUPPORTED`, no calibrated/final output.
- One observed judge → offset 0 with diagnostic `SINGLE_JUDGE_UNCALIBRATED`; raw/normalized values may match, but never display “calibrated.” Live completeness may still be valid for an explicitly configured single-judge round.
- No evidence/no projects → `INCOMPLETE_EVIDENCE`, never successful empty results.
- Live completion requires every enrolled project have exactly R distinct eligible committed assignments and exactly R valid finals; no active pending assignments. Cancelled historical assignment rows are excluded from active R. m > R is also an error.
- Historical analysis uses actual m and labels completeness UNKNOWN; no invented R=2/3 chosen just to make it finalizable.
- Project normalized mean uses actual valid review count m and `(rawScore - bias)` values.
- SD uses sample denominator `m-1` around the unclamped mean; m=1 → null, true SD=0 → `0.00`.
- Sort full-precision normalizedMean descending. Only exact equal computed values use a deterministic hash of UTF-8 JSON `["tie-v3", eventId, stageId, projectId]`. Remove the undocumented raw-mean secondary tie rule and epsilon comparator. Do not rank rounded/clamped numbers.
- Store full-precision normalizedMean; displayedMean alone is clamped to [0,100] and rounded to two decimals.

The current implementation is a two-way additive least-squares formulation whose pair contribution effectively carries a 1/m factor; it is not the above pair-overlap objective. This is an objective mismatch, not evidence that every least-squares alternative is inherently invalid.

Independent golden dataset (raw scores already on a 100-point scale):

| Project | Judge a | Judge b | Judge c |
|---|---:|---:|---:|
| p1 | 60 | 80 | missing |
| p2 | 40 | 50 | 90 |
| p3 | 20 | missing | 70 |

Use the pure estimator or historical-analysis mode for this uneven-count test, not a live exact-R completion test.

Expected `pair_overlap_wls_v3` reference, independently solved during this audit:

| Output | Expected |
|---|---:|
| bias a | -21.66666666666667 |
| bias b | -7.916666666666668 |
| bias c | 29.58333333333333 |
| p1 normalized mean | 84.79166666666667 |
| p2 normalized mean | 60 |
| p3 normalized mean | 41.04166666666667 |
| p1 SD | 4.419417382415922 |
| p2 SD | 1.9094065395649333 |
| p3 SD | 0.8838834764831844 |

Tolerance 1e-6. The current function returned p1≈84.6666666662 and p3≈41.3333333351 for the same data. The existing two-judge equal-coverage toy test cannot distinguish these objectives.

### 5.7 Transaction, hashes and publication contract

Create calculation DTOs containing status, reason, evidenceOrigin, completeness, calibrationStatus, method, implVersion, inputHash, configHash, results and diagnostics. Store `method='PAIR_OVERLAP_WLS'`; `SUCCESS` belongs in status.

Canonical hash inputs must use stable sorted arrays and deterministic JSON encoding. Configuration includes algorithm version, tie version, origin/coverage policy, rubric content, stage scope, R, and relevant eligibility/assignment policy. Evidence includes enrolled population, project versions/snapshots, rubric/version, committed assignment IDs/statuses, all final criterion values, comments and known timestamps, and import provenance. Including only rubric.id or aggregate weighted raw scores is insufficient.

Use one transaction client for preview validation inside commit; do not call a global Prisma reader from inside a separate transaction. For all review, close, assignment, repair, calculation and finalization writes, lock the relevant Event and JudgingStage rows in that order, then assignments in stable ID order. Event-level revocation locks the event before its affected stages. Recheck permission/state inside the transaction. Use serializable transactions with bounded retry for serialization errors; after retry exhaustion return a conflict, not a fabricated success.

Persist one calculation per unique content hash. Invalidation must exclude old runs. Finalization locks/rechecks the stage and selected run, requires LIVE origin and complete supported evidence, and stores the **full canonical immutable snapshot** with hash. Terminal FINALIZED stages cannot be silently reopened. Corrections require a new version/stage; do not rewrite published evidence.

Publication explicitly points to the finalized snapshot. Public views and final CSVs resolve that snapshot's calculationRunId, never “latest finishedAt.” Expose only intended public project/award fields, not judge identities, individual scores/comments, offsets, or internal audit material. No new global/live leaderboard. Historical fixture analysis remains organizer-only.

## 6. How to give this to Antigravity

Use a **new Antigravity chat for this correction pass**. Your old conversation contains superseded assumptions and partial completion claims. Keep it as history. Do not make the new chat rediscover architecture from scratch.

1. Save this file into the project as `docs/T2-CRITICAL-IMPROVEMENTS-PLAN.md`.
2. Save both source attachments as `docs/review-inputs/changes-1.md` and `docs/review-inputs/changes-2.md`.
3. Keep existing decisions and official files; do not delete older docs. Mark older conflicting plans superseded by this one.
4. Paste the bootstrap prompt below once.
5. Then paste **one phase prompt at a time**, in order. Do not paste all implementation prompts together.
6. After each phase, require its concrete verification output and commit/checkpoint. Do not accept “should pass.” If a test cannot run, record blocked rather than completed.
7. Keep the same new chat while it retains reliable context. If it becomes overloaded, start another chat with the plan, latest status, current commit and the next phase number. Disk-based handoff is authoritative.

### Bootstrap prompt — give this first

```text
We are continuing the existing kryPsis Dogfood Next.js project, not starting a new app.
Read AGENTS.md, docs/T2-CRITICAL-IMPROVEMENTS-PLAN.md in full, both documents under
docs/review-inputs, docs/official/spec.md, run.py and fixtures.json. Read the current
code before changing it. Relevant baseline: fb4a41143f1da55984d51a7871ee4fadb7d80f5d.
If HEAD differs, identify material differences and preserve valid newer work.

This corrective plan is the implementation authority when the attachments or older
plans conflict. Preserve Next.js/TypeScript/PostgreSQL/Prisma/Better Auth and local
black/red UI. Do not add a separate backend or cloud dependency. Keep official files
unchanged. Never make judge scores/exports public to satisfy the checker.

Follow all binding decisions in sections 5 and 8. Important: COMPLETED is persisted
final assignment status; imported fixture coverage is unknown; historical analysis
cannot become a fabricated finalized live round; no PUBLISHED state exists.

Do not regenerate the design. Execute only the phase I request. Before code edits,
read the applicable installed Next.js docs required by AGENTS.md. Do not reset my DB,
run wipe scripts, delete evidence or alter existing secrets. Report destructive data
conflicts instead of silently deciding. Use transactions and real authorization.

Maintain docs/T2-CORRECTION-STATUS.md with phase status, commit, changed files,
commands and actual results, remaining limitations, and next phase. Keep raw test
output free of cookies/password hashes. Never mark a phase complete on mocked tests
alone if its gate requires real PostgreSQL/HTTP. Do not claim full T2 completion from
seven shallow runner checks. Begin with Phase 0 only when I send its prompt.
```

### Phase 0 — checkpoint, data inventory and baseline

**Goal:** preserve the working system and distinguish local SQL repairs from reproducible code.

Before asking Antigravity to mutate data, create a backup. For Windows PowerShell, avoid binary `pg_dump > backup.dump` redirection; use a file inside the container and copy it out:

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
docker compose exec -T db pg_dump -U dogfood -d dogfood_db -F c -f /tmp/dogfood-before-t2-corrections.dump
docker compose cp db:/tmp/dogfood-before-t2-corrections.dump ./backups/dogfood-before-t2-corrections.dump
```

Backups must be ignored by Git. Keep your existing edits; checkpoint them intentionally. Never assume a blank working tree.

```text
Execute Phase 0 of docs/T2-CRITICAL-IMPROVEMENTS-PLAN.md. Inventory git status and HEAD,
package scripts, actual app/DB deployment, Prisma migrations, current fixture import,
EventRole, EventJudgeAccess, JudgingStage, AssignmentRun, RubricAssignment statuses,
StageReview/criterion counts, CalculationRun, FinalizationSnapshot and published flags.
Use the same database as the running application. Do not print credentials or cookie
headers. Record differences from baseline fb4a411 and the attachments.

Confirm backup exists before any repair. Produce a read-only report identifying
known manual SQL artifacts, role conflicts, unrecognized statuses, missing/extra
criteria, cross-event resource references and mock calculation candidates. Do not
apply the report's SQL deletion snippets. Read the existing assessment generator.
Run existing typecheck and vitest; record the unmodified runner result without
pretending invalid-cookie denial checks prove authorization. Create the status file.
Gate: saved baseline and data inventory; no destructive mutation or feature rewrite.
```

### Phase 1 — acceptance authentication and reproducible local setup

**Files:** `scripts/generate-assessment-config.ts`, package scripts, README setup sections; add `scripts/verify-acceptance.py` later in phase 9. Preserve the existing Route Handler security logic.

```text
Execute Phase 1. Follow section 2 exactly for the actual deployment. Reproduce the
401s, then run the existing real-login generator against the running app and same DB.
For Docker, copy its generated /app/.dogfood.toml to the host before running Python.
Do not import another machine's cookies, mint fake sessions, add admin to test roles,
or change auth.api.getSession to trust arbitrary role headers.

Retain the generator's preflights and atomic file replacement. Add optional
DOGFOOD_CONFIG_PATH output support for phase 8; default remains root .dogfood.toml.
Validate judge A and B own evidence, not only HTTP 200. Verify A-specific peer URL is
200 for A and 403 for B, participant 403, organizer export with real rows, judge export
403, unknown/expired auth 401, and actual closed submission returns EVENT_CLOSED.
Do not print secrets. Do not remove historicalReviews until compatibility clients
are updated. During modern migration add checks for genuine modern own evidence too.

Document that generated cookies/user IDs are installation-specific. Keep the required
root .dogfood.toml, but add a credential-free .dogfood.example.toml as the template;
the root working config is regenerated locally. Never commit live deployment sessions.
Keep honest tier claims explicit. Capture actual acceptance output. Report the exact
failure if preflight fails; do not overwrite a valid config with partial credentials.
Gate: all 7 official checks pass with real authenticated isolation checks. This gate
does not mark the remaining T2 workflows finished.
```

**Stop and inspect:** If phase 1 still fails, fix the named environment/login/membership issue before redesigning dashboards. The reviewed revision already passed this phase with its existing generator.

### Phase 2 — schema, fixture projection and non-destructive repair

**Files:** `prisma/schema.prisma`, new migrations, `scripts/seed.ts`, new `scripts/repair-fixture-history.ts`, new `lib/fixtures/import.ts`, `tsconfig.scripts.json`, `DATA-MODEL.md`.

```text
Execute Phase 2. Implement sections 5.3–5.5 exactly, using additive/backfilled schema
migrations. Create the canonical fixture historical projection in modern tables with
explicit provenance, unknown original submittedAt, deterministic IDs and COMPLETED
statuses only for validated finals. Do not fabricate missing review assignments or
claim exact-R historical completion. Preserve original legacy evidence and duplicate
project prj_41. Declare the 3333/3333/3334, max5 rubric assumption explicitly.

Fresh seed must create public MULTI_TRACK evt_01, 8 tracks, 30 named source judges,
39 track links, an ordinary organizer, ACTIVE judge access, 41 stage projects,
30 stage judges, 126 COMPLETED observed assignments, 126 final reviews, 378 scores,
1 immutable rubric and 1 deterministic import assignment run. Use the existing
assessment_organizer@dogfood.local identity as the ordinary fixture organizer; do not
make it admin. A previously created organizer@example.com may remain; do not delete it.
Create source-owned demo credentials if missing; never reset existing user passwords.

For preexisting databases use the dry-run repair report and explicit --apply for the
matched manual artifacts. Quarantine mock runs, archive noncanonical imported stage,
remove invalid publication and retain evidence. Never blanket-delete calculation data.
Fresh historical stage begins CLOSED; real analysis is performed after phase 4.

Make fixture import transactional and safe on repeated boot. Existing seed-owned
objects may be backfilled where genuinely missing; never restore a revoked role/access
or overwrite an organizer's later edits on restart. Import version/provenance decides
what to create; do not use update:{role:'JUDGE'} every boot. Store actual rawPayload,
counts and source SHA. Serialize concurrent import using a transaction-scoped source
lock. Use an explicit bounded transaction timeout suitable for the full import.

Add a separate script typecheck, since current tsconfig excludes scripts. Tests must
use real PostgreSQL: empty migration+seed, repeated seed stable IDs/counts, revoked
judge stays revoked, modified event survives reseed, old manual SUBMITTED data repairs
only with valid finals, missing source time stays null, mock result stays archived,
no fabricated live finalization. Gate: clean and existing DB paths both verified.
```

### Phase 3 — shared authorization, immutable reviews and judge UX

**Files:** `lib/permissions.ts`, `lib/judging/auth.ts`, `lib/session.ts`, judge scores route, judge dashboard/detail/form/actions, organizer page/actions, revocation route.

```text
Execute Phase 3 after the access/provenance backfill. Implement section 5.2 shared
permissions and section 5.7 transaction locking contract. Use current authenticated
identity plus event membership/access; verify assignment.stage.eventId and enrolled
project, pinned rubric and criterion ownership. Replace duplicated organizer checks
with the shared organizer-or-platform-admin guard across pages/APIs/actions.

Read-own review must remain allowed after stage CLOSE/CALCULATED/FINALIZED and outside
judging time, while current judge permission is active. Assignment detail calls
mode:'read'; draft/submit calls mode:'write'. Writes require LIVE origin and OPEN
window. Revoked/cancelled/inactive assignments remain blocked. Historical reviews are
read-only regardless of stage state. Do not return peer finals or peer comments in
any judge DTO, server-component props, HTML or serialized response.

Submitted rendering derives score/comment directly from persisted finalReview and its
pinned rubric, not one-time useState. Editable draft state exists only before final.
After successful submit refresh server data and lock immediately. Display per-criterion
value/max and weighted raw total /100 on dashboard and detail. Do not show calibrated
ranking or peers to judges. Treat null submission timestamp as unknown historical time.

Draft-save and final-submit must recheck access/state/deadline/status after locks within
the transaction. Exactly one final review per assignment. Identical retry returns the
persisted review without changes; changed retry conflicts. A draft-save racing final
cannot recreate a draft after final. Close and revoke races must have a defined lock
winner. Use exact criterion validation, min/max bounds and bounded comment length.
Use structured errors and preserve no-store headers on private responses. Enforce
PUBLIC event visibility on anonymous gallery/detail routes; organizer/admin preview
is separately authorized. Do not break fixture gallery: phase 2 makes evt_01 PUBLIC.

Tests: own/peer/participant/unrelated-event/admin boundaries with valid sessions;
read after close; write after close fails; revoke versus submit; draft versus submit;
same/different payload retries; historical write fails; refresh/back navigation show
the same persisted values; 0 is displayed as 0. Re-run official acceptance.
Gate: real PostgreSQL write-concurrency tests and at least one real browser judge flow.
```

### Phase 4 — versioned estimator and calculation integrity

**Files:** `lib/judging/calculation.ts`, new pure `lib/judging/math.ts`, calculation tests, JUDGING.md.

```text
Execute Phase 4. Implement section 5.6 pair_overlap_wls_v3 exactly, separating the pure
estimator from Prisma evidence collection and completion validation. Do not call the
current 1/m-weighted equations the same objective. Use sorted canonical input and a
constrained Laplacian solve with pivot/residual/finite checks. Add the independently
specified uneven-count golden test; preserve prior valid tests while correcting tests
that conflate arbitrary synthetic math input with validated 0..100 rubric input.

Evidence reader uses the pinned rubric and canonical COMPLETED records with exact
valid finals; never skip missing/foreign criteria or coerce missing evidence to zero.
Use full stage population for completeness, including zero-review projects. Enforce
exact R for LIVE and unknown planned coverage for FIXTURE. Disconnected calibration
is unsupported; single-judge result is explicitly uncalibrated, not “fairness proven.”

Implement canonical config/input hashes and transaction-client injection from section
5.7. Store method PAIR_OVERLAP_WLS and implVersion pair_overlap_wls_v3. Return the actual
failure reason in preview. Preserve invalidated old runs. Guard against empty success,
stale previews, duplicate commits, and method/version changes reusing old results.

Tests include reference uneven dataset; equal-coverage toy; permutation invariance;
constant judge; one-review SD=null; true SD0; disconnected graph; no evidence; exact R;
excess R; missing criterion; wrong rubric; nonfinite input; normalized means above100
ranked before display clipping; exact ties; changed config/evidence invalidates hashes.
Calculate the canonical fixture's real historical analysis with actual m and label
coverage unknown. It may be CALCULATED but cannot finalize or publish.
Gate: independent reference numbers within 1e-6 and persisted calculation provenance
verified in PostgreSQL. Update documentation to describe estimates, not objective truth.
```

### Phase 5 — reachable lifecycle, immutable finalization and results

**Files:** judging actions, `JudgingStagesSection.tsx`, organizer results page, public results route, finalization services, snapshot persistence.

```text
Execute Phase 5. Use existing StageState values only. Add CALCULATED to dashboard
results-link visibility. Direct organizer results access must use shared authorization
and return an honest view of CLOSED/CALCULATING/CALCULATED/FINALIZED. Do not add a fake
PUBLISHED enum; publication is a reference to a finalized immutable snapshot.

Separate preview from persisted results in the UI. On CLOSED: show Calculate Preview;
when supported show Commit. On CALCULATED: show selected persisted run, recompute option
and an explicit Finalize button for eligible LIVE rounds. On FINALIZED: display frozen
snapshot and explicit Publish action only if permitted. Persisted published status
must survive reload; do not rely on local useState(false). FIXTURE analyses show why
finalization/publication is unavailable. Unsupported/incomplete previews cannot commit.

Finalize in one locking transaction, compare full current evidence/config, validate
exact completion, current successful non-invalidated run, and store the complete
canonical snapshot. Make same-run retry idempotent and changed-run retry a conflict.
Publish points to that snapshot. Public page and final CSV must resolve its run and
cannot be changed by inserting a newer calculation. Include project names, IDs,
actual review counts, raw/normalized/displayed values as appropriate, known provenance
and SD (zero as 0.00). Remove stale raw-fallback/calibrated claims.

Tests: ordinary live stage can complete every transition using actual UI controls;
CALCULATED direct URL works; stale calculation cannot finalize; imported mock cannot
publish; new run cannot alter already published output; unrelated event cannot read
results; final public DTO contains no judges/comments/offsets. Preserve public scores
only when explicitly configured. Gate: complete live calculate→commit→finalize→publish
flow with persisted reloads, plus historical-analysis blocked-finalization test.
```

### Phase 6 — event modes, invitation lifecycle, assignment and dropout repair

**Files:** organizer forms/page props, proposal actions/form/schema, all judge-access routes, invitation accept/confirm/reactivate, assignment service, dropout repair and readiness.

```text
Execute Phase 6. Use SINGLE_POOL and MULTI_TRACK everywhere; TRACKED is descriptive,
not a stored value. Pass actual tracksMode to event settings and JudgesSection. Add
mode to proposal create/edit and copy it on approval. Validate mode server-side.

For SINGLE_POOL hide track controls and explicitly send trackIds:[]; reject nonempty
track selections. For MULTI_TRACK require a nonempty deduplicated string array of
tracks belonging to that event. Normalize undefined to [] only in single-pool mode;
reject invalid non-array input. Current POST accepts undefined then calls .map; fix
that. Use one validator for POST/PATCH/confirm/accept/reactivate. Preserve transactional
access and JudgeTrack synchronization and version checks. No-track PATCH must work.

Track-mode changes are disallowed once projects, effective judge track grants, or
committed stages reference the old structure; return clear recovery guidance rather
than silently deleting links. Explicit fixture repair handles its known initial mode.
Support existing-user awaiting-confirmation and new-user offline copyable invite link.
Do not imply email was sent. Invitation acceptance/confirmation cannot grant a judge
role that conflicts with that event's organizer/participant role.

For assignment, build the eligible panel from current ACTIVE event access plus scope,
track eligibility, team conflicts and configured capacity. Preserve configured panel
capacities instead of deleting them during commit. Use stable precomputed hash tie
keys; never random comparator calls. Construct exact R distinct assignments per project
with deterministic capacitated bipartite matching; validate the resulting loads and
completed-evidence overlap support. Distinguish proven infeasible matching from a
bounded search failing to find a connected assignment. For connectedness repair use
deterministic valid edge swaps preserving R/capacity/conflicts; if no supported plan
is found, return CONSTRUCTION_FAILED without changing stage state. Do not label a
single-judge panel calibrated. Preview is read-only; only successful commit freezes
population/rubric/project snapshots and opens stage, atomically with audit.

Dropout repair uses the same eligibility/capacity/conflict rules, preserves all finals,
cancels only unfinished assignments, creates a new run with actual inputs and reason,
and checks coverage/overlap. Mark the dropped stage judge inactive even when no pending
work remains. Any infeasible repair rolls back the whole replacement operation. Access
revocation remains effective even if assignments cannot yet be repaired; expose a
readiness blocker rather than letting a revoked judge continue. Lock in the order
specified in section 5.7 and audit actors.

Tests: single-pool create+edit invite, multi-track invite, foreign track rejection,
mode survives unrelated event edit and proposal approval, participant conflict,
revoke/restart stays revoked, capacity/conflict/exactR, deterministic preview, failed
preview no state change, dropout preserves finals and reports infeasible replacement.
Gate: real UI+database flows for both event modes and safe repair.
```

### Phase 7 — organizer/admin UX and usable exports

**Files:** JudgesSection, new `/organizer/events/[eventId]/judges/page.tsx`, dashboard sign-out component, HomeClient, admin navigation/legacy request endpoints, exports route and CSV helper.

```text
Execute Phase 7. Preserve black/red tokens and existing working components. Organizer
dashboard shows at most two judge rows, deterministically ordered by normalized email
then ID, with actual total and View all judges link. Full dedicated judges route uses
the same organizer/admin guard, supports search/status/page, invitation and management
controls. Keep stages/readiness visible without scrolling through thirty judges.
Do not fetch/render the complete directory just to truncate visually if pagination
is straightforward; provide limit/total in the protected API.

Create shared client SignOutButton using the working Navbar authClient.signOut pattern.
Only redirect/refresh after successful sign-out; show error otherwise. Reuse on the
dashboard. Protected server pages must reject the old session on reload/back navigation.
HomeClient shows Propose an Event for any authenticated user and links to
/organizer/events/new; label that page/form consistently as a proposal. No privilege
comes from button visibility or canCreateEvents. Proposal actions validate names,
slug/timezone/finite dates/team size/mode server-side, and approval grants organizer
on that one created event, preserving revision checks and tracksMode.

Admin already has pending Event Proposals count/link: keep it. Add distinct Organizer
Access Requests (legacy) navigation and explanatory text. Keep records readable and
allow an audited explicit conversion to an owned event proposal only where fields can
be supplied/validated; do not guess a missing slug/deadline. Retire old global grant,
new legacy request and toggleCanCreateEvents mutation paths with structured 410 or
migration guidance. Preserve existing event roles. Do not merely hide buttons while
old privilege-grant endpoints remain live. Legacy pending requests remain visible
until handled; display them separately from SUBMITTED EventProposal counts.

Create one typed CSV helper: RFC-style quote escaping, consistent column counts,
stable ordering, UTF-8 BOM for Excel. Keep numeric fields numeric (including negative
biases); neutralize formula-like user TEXT including leading whitespace/control
prefixes. Escape embedded commas, quotes and newlines. Use private/no-store headers
on private success and error responses. Guard every export by event and stage.

Export contracts:
- historical_reviews: event/review/project/judge IDs, project title, judge name/email,
  criterion key/name, original value, comment, source, source key, importedAt and
  nullable originalSubmittedAt. 378 criterion rows for the intact fixture.
- assignments: event/stage/run/assignment/project/judge IDs, readable names/emails,
  status, origin, createdAt; no fabricated submittedAt.
- raw_reviews: one row per criterion, review/assignment/rubric identity, titles,
  names/emails, value/max/weight, comment, submittedAt/importedAt, origin.
- diagnostics: selected calculation identity, method/version/status/completeness,
  judge identity, count, offset, component/support information.
- results: project identity/title, run/snapshot identity, method/version/origin,
  actual review count, rawMean, normalizedMean, displayedMean, SD, rank, finality label.
Historical analysis may export genuine rows labelled HISTORICAL_ANALYSIS, provisional
live results PROVISIONAL; final output is pinned to the snapshot run. Never return a
ragged single warning row pretending to be project results. Return a clear structured
409 when no valid calculation exists, or a documented real header-only evidence export
only if the requested dataset is legitimately empty. Honor stage/run/event binding.

Tests: exactly two dashboard rows, full list paginates, non-organizer denied, sign-out
invalidates session, ordinary user proposes without direct creation privilege, legacy
grant cannot bypass proposals, quoted/formula-text CSV roundtrip, numeric negatives,
IDs+names present, missing timestamp empty, no private CSV publicly accessible.
Gate: requested user journeys work on desktop and mobile, with actual screenshots or
browser evidence recorded in status. Do not introduce a redesigned app or new features.
```

### Phase 8 — offline packaging, bootstrap and predictable restarts

**Files:** Dockerfile, root Compose, optional build/development overrides, runtime bootstrap script, health endpoints, generator output-path support, README and OFFLINE-RUNTIME.

```text
Execute Phase 8. Keep local PostgreSQL and uploads volumes. Fail immediately when
DATABASE_URL or required auth configuration is absent; remove inconsistent fallback
DB connections. Never log credentials, password hashes or raw session cookies. Keep
local/system fonts and no mandatory external calls for auth, invitations, seed or math.

Package runtime dependencies/scripts explicitly. The reviewed image uses full Next
build and next start, not standalone. If seed/repair now imports lib modules, bake the
required lib/generated modules and tsconfig into the image or bundle the scripts; do
not depend on production bind mounts to source. Use installed local executables for
migrate/seed so missing packages fail instead of npx downloading at runtime. Keep
migrate deploy and non-destructive seed before the HTTP server becomes ready.

For local assessment mode implement a start wrapper: migrate, seed, start Next as
child, wait for HTTP live endpoint with a bounded timeout, run real-login generator
against the same local app/database, atomically write /app/assessment/.dogfood.toml,
then declare readiness. Forward SIGTERM/SIGINT and propagate child/bootstrap failure.
The liveness endpoint must not require assessment config; readiness does, avoiding a
bootstrap deadlock. No auth bypass or fabricated sessions. General deployments may
disable assessment bootstrap; normal authorization never changes.

Keep root docker compose up able to start the seeded release without internet when
release images have been supplied. Add an explicit local image tag and pull_policy:
never to release configuration; put build behavior in a documented build override.
Prepare an image archive containing app and PostgreSQL images, record SHA256 and image
IDs, and document docker load before offline compose up. A brand-new disconnected
machine cannot fetch npm packages/base images; do not claim a cold offline build.
Do not use cloud image pulls in the offline start path.

Provide scripts/assessment.ps1 for Windows: start/wait for ready containers, copy the
generated config from container to root, run unchanged checker through the verification
wrapper, and save the report. Avoid binary backup redirection in PowerShell. Document
host DATABASE_URL=127.0.0.1 versus in-container DATABASE_URL=db. Avoid source mounts in
release. Keep seed safe across stop/start after real reviews and after revocation.

Gate: provision images, disconnect external network while retaining local container
network, start on a fresh test volume, generate valid config, run all 7 checks, perform
local login/review/export, restart without losing evidence or regranting access. Record
exact test conditions. If Docker/offline testing is unavailable, report blocked, not
passed; the release is not certified offline until this gate actually runs.
```

**Target operator workflow after this phase** — the scripts/image artifact are outputs to implement, not files already present at the reviewed commit:

```powershell
# Provisioning step, before disconnecting; use the supplied release archive.
docker load -i .\release\dogfood-images.tar

# Runtime, with external internet disconnected.
docker compose up -d
.\scripts\assessment.ps1
```

The plain manual equivalent after the new bootstrap writes its configured output is:

```powershell
docker compose cp app:/app/assessment/.dogfood.toml ./.dogfood.toml
python scripts/verify-acceptance.py .dogfood.toml --output acceptance-report.txt
```

Note the new bootstrap path differs from the current `/app/.dogfood.toml` used in section 2. Update all instructions together when introducing the new path.

### Phase 9 — regression gates, evidence and submission docs

```text
Execute Phase 9 only after preceding phases have concrete verification. Implement
scripts/verify-acceptance.py as a wrapper around docs/official/run.py, never edit the
official runner. Save its exact stdout as acceptance-report.txt; preserve failure
output and return nonzero if the child fails, a FAIL line exists, the seven expected
check labels are missing/duplicated, or verified tiers do not match the claim. Do not
replace output with a hand-written summary or regard runner exit0 as success.

Run npm run typecheck, script typecheck, vitest run, production build, real PostgreSQL
integration tests and the Playwright workflow/security matrix in section 7. Install
needed browser binaries during provisioning, not offline runtime. Run the official
checker against the final production app with fresh real non-admin judge/participant/
organizer identities. Verify both own evidence and authenticated denials, not statuses
from expired sessions. Assert modern fixture records really appear in the judge UI.

Use separate disposable test databases/Compose project volumes for fresh-install and
upgrade tests; explicitly guard integration tests against pointing at the real user
DB. Never reset my working DB to make tests green. Compare expected fixture counts,
review values and duplicate project preservation. Exercise reseed and restart after
mutations and compare evidence hashes, not just row counts.

Update README.md, ARCHITECTURE.md, DATA-MODEL.md, JUDGING.md, docs/OFFLINE-RUNTIME.md,
docs/T2-CORRECTION-STATUS.md and existing stale status/handoff files. Document exact
math version, historical limitations, local accounts, config regeneration, schema and
repair process, finalization/publication, tests and honest outstanding limits. Keep
OSI license and link the five-minute demo. Do not claim pairwise/normalization proof/
T3/T4 just because routes exist. Root .dogfood.toml and the actual acceptance report
must correspond to the final revision and local evaluation setup.

Gate: all required matrix rows have actual evidence, 7/7 official PASS, no auth bypass,
real scoring/export/finalization workflow works, clean-install/upgrade/restart/offline
gates pass. Finish with changed files, test results, limitations, and exact commands
for me to repeat. Do not push or publish anything unless separately requested.
```

## 7. Required verification matrix

The existing 22 tests are a useful starting point; preserve them. Add tests at the layer where the risk exists. Mocked Prisma calls cannot prove database uniqueness, transaction races, fresh migration or real cookie handling.

| Area | Test | Expected result |
|---|---|---|
| Authentication | Fresh DB, checked-in stale cookies | Fails clearly; bootstrap replaces them using real logins |
| Authentication | App and generator use different DB | Generator refuses to write config |
| Authentication | Signed-out/expired user scores/export | 401 |
| Isolation | A own scores; B own scores | 200, own actual evidence only |
| Isolation | A-specific resource as A versus B | 200 versus 403 |
| Isolation | Participant and unrelated organizer | Cannot access judge/foreign organizer evidence |
| Isolation | Event A role with Event B stage/assignment/run | Denied before query/mutation exposes evidence |
| Isolation | Revoked access after restart | Remains revoked; no old role resurrection |
| Fixture | Fresh seed | 41 projects, 30 judges, 8 tracks, 39 links, 126 reviews, 378 values; correct names and mapping |
| Fixture | Canonical modern projection | One historical stage/run, exact source values and UNKNOWN planned coverage |
| Fixture | Duplicate prj_41 | Preserved and linked/labelled as duplicate, not deleted |
| Fixture | Seed twice, seed after real changes | No duplicate projection or overwritten evidence/permissions |
| Upgrade | Existing SUBMITTED manual import | Validated migration to COMPLETED; invalid/incomplete rows reported |
| Upgrade | AVG mock and bogus hashes | Invalidated/archived; no final/public output reads them |
| Judge | Submit, refresh, reopen after close | Persisted criterion values/comment and total remain visible/read-only |
| Judge | Changed final retry | Conflict; values unchanged |
| Judge | Identical final retry | Same persisted review; no duplicate |
| Judge | Save draft races final | No draft recreated after final |
| Judge | Submit races close/revoke | Defined serialized outcome; no late unauthorized final |
| Rubric | Missing/extra/foreign criterion | Validation failure, no partial score |
| Rubric | Valid zero score | Saved/displayed as zero; not “missing” |
| Events | Propose as normal user; approve as admin | One event, one event-specific organizer grant; no global grant |
| Events | Proposal/edit tracksMode | Correct mode survives approval and unrelated edits |
| Events | Single pool invite/PATCH | Works with [] and no track controls |
| Events | Multi-track invite/PATCH | Same-event valid selections only |
| Events | Stale invitation update/version | Conflict, no partial grant changes |
| Assignment | Exact R, team conflicts, capacity | Valid plan or precise infeasibility; no own-team judging |
| Assignment | Repeated/permuted preview | Same deterministic plan/hash; no preview writes |
| Assignment | Commit after config/population change | 409 stale preview |
| Assignment | Dropout without pending work | Judge still deactivated; finals retained |
| Assignment | Infeasible replacement | No partial replacement; access remains revoked if separately revoked |
| Math | Uneven golden test in section 5.6 | Reference outputs within 1e-6 |
| Math | Disconnected, empty, zero-review project | Explicit unsupported/incomplete result |
| Math | Single judge | Honest uncalibrated diagnostic |
| Math | Live m<R and m>R | Cannot finalize |
| Math | Historical uneven m | Real analysis, coverage UNKNOWN, no finalization |
| Math | Missing/foreign criterion or invalid range | No silent skip or partial score |
| Math | 101 versus100.5 normalized values | Correct full-precision order despite identical clamped display |
| Math | m=1 and true SD=0 | null versus 0.00 |
| Lifecycle | UI from CALCULATED | Results visible and live Finalize action reachable |
| Lifecycle | Stale config/review/run | Finalization blocked |
| Lifecycle | Newer run after publication | Public output unchanged, pinned snapshot |
| CSV | Historical fixture export | 378 criterion rows plus header; IDs and readable fields |
| CSV | Formula-like text, quotes/newlines, negative bias | Safe text and valid numeric/CSV roundtrip |
| CSV | Empty/unknown historical time | Empty original timestamp, separate import timestamp |
| Admin | Existing proposals + legacy requests | Both visible with distinct meaning; retired grant cannot execute |
| UX | Dashboard judges count 0/1/2/30 | At most two preview rows; useful empty state/full list |
| UX | Sign out then back/reload | Protected data denied by server |
| T1 | Authenticated participant past deadline | EVENT_CLOSED and no database mutation |
| T1 | Public gallery/detail | SSR public fixture titles; draft events not anonymously browsable; no private judge data in HTML/JSON |
| Runtime | Production build and boot | No dev-only reliance |
| Runtime | Preloaded images, external internet off | Local login, fixture seed, judge workflow and exports work |
| Runtime | Restart after submitted review/calculation | Data/snapshot hashes unchanged |
| Acceptance | Unchanged runner on final app | Seven PASS lines and expected verified-tier line |

Use at least two events and distinct non-admin users in authorization integration tests. Include a platform admin separately. Do not make every test actor an admin, and do not mock getSession for the real-cookie acceptance checks.

### Minimum full live demonstration dataset

Use a separate deterministic demo event, not the closed official fixture. Seed local logins for one ordinary organizer, two judges, and participant teams. Prepare three submitted projects with two judges eligible for all three, rubric weights summing 10,000, and R=2. Leave the stage configurable so the UI demonstrates preview/commit, six genuine submissions, close, calculate, finalize and publish. Give the demo dates a clearly documented demo policy; never change the official fixture's fixed submission deadline.

A second MULTI_TRACK test event verifies track-scoped eligibility and invitations. Tests may create these in disposable databases. The manually demonstrated live event can be created through proposals to prove that workflow too. Demo state and fixture imported state must not be confused in the organizer interface.

## 8. Additional implementation details that must not be guessed

### Dates

The official fixture deadline remains `2026-03-01T18:00:00Z`. Judging dates are distinct from submission dates. Server time is authoritative; default client dates are not permission to submit late. Dates in UI should state event timezone. Historical fixture review submission timestamps are absent and must remain unknown.

The current `parseLocalInTimezone` uses one offset guess and does not reliably resolve DST gaps/ambiguities. During event input validation, replace it with a deterministic timezone conversion helper: strictly parse calendar fields, find UTC instants matching the requested local wall-clock fields in the selected IANA zone, reject zero matches (nonexistent local time), and require an explicit offset choice for two matches (ambiguous time). A vetted pinned local timezone library is acceptable; document and bundle it. Do not silently shift an invalid time. Test Asia/Kolkata, UTC, and DST gap/overlap cases. This belongs with phase 7 proposal/event validation, not authentication troubleshooting.

### Track and role safety

A user may organize one event and judge or participate in another. The one-role-per-event constraint does not make them a global organizer. API and server-action authorization always resolves the requested event. Preserve separate platform-admin capability. Validate compound event/role admin filters against the same membership.

Do not change fixture tracks to empty just to make SINGLE_POOL invitations pass. Set the fixture's correct mode; use a different real single-pool event to test no-track behavior.

### Scores and calculation labels

A judge's own “Score /100” is their rubric-weighted raw review score. It is not a peer-normalized result or a public ranking. Organizer diagnostic scores may be calibrated only when the estimator supports them. Historical analysis does not prove assignment completeness. A hash proves content identity/reproducibility, not a cryptographic signature or absolute fairness.

### Error recovery

Keep errors actionable: invalid session → sign in/regenerate config; no stage → configure a live stage or view historical import; insufficient judges → invite/confirm eligible judges; invalid weights → show remaining basis points; incomplete evidence → missing counts by project; disconnected overlap → explain unsupported comparison. Do not show a success alert when the server action returns `{error}`. Do not leave loading state permanently active if an action throws.

### Audit history and invalidated runs

Invalidation is not deletion. Store who performed repair, reason, source hash, old/new stage IDs and affected run IDs. A repair report must distinguish source facts from application assumptions. Never change hashes on a fabricated run to make it appear valid. Never migrate a legitimate live final into a fixture merely because its name resembles “Initial Fixture Round.”

## 9. Documents and files to deliver with the finished project

| File/artifact | Required content |
|---|---|
| README.md | Exact local/offline startup; fixture/demo logins; host/container DB distinction; config generation; current tier claim; honest limitations; demo link |
| ARCHITECTURE.md | Next/server services/PostgreSQL/local assets; permission boundary; transaction strategy; modern history projection; no mandatory cloud |
| DATA-MODEL.md | Current schema, status/provenance meanings, source mapping, import idempotency, nullable source time, safe upgrade/repair |
| JUDGING.md | Exact raw formula, pair_overlap_wls_v3 objective, support/completion rules, historical policy, independent reference test, SD/ties, snapshots and limits |
| docs/OFFLINE-RUNTIME.md | Online provisioning versus offline runtime; image bundle/load; volumes; startup/readiness; restart verification |
| docs/T2-CORRECTION-STATUS.md | Phase-by-phase real verification, final commit and remaining blockers |
| docs/T2-CRITICAL-IMPROVEMENTS-PLAN.md | This approved guide; reference input for Antigravity |
| docs/review-inputs/ | Both original attachments; mark diagnostic SQL as historical, not production instructions |
| .dogfood.example.toml | Credential-free structure and generator instructions |
| .dogfood.toml | Required root config; generated for the actual local evaluation installation with honest claims |
| acceptance-report.txt | Actual stdout of unchanged official runner on the final tested revision |
| tests/ | Pure math + guards + real PostgreSQL integration + essential browser workflows |
| LICENSE | Existing or selected OSI-approved license |
| release artifacts | Prebuilt app/PostgreSQL image archive or approved provisioned equivalent, checksums and image identities |
| Demo video | Five-minute walkthrough showing genuine T1/T2 behavior and limitations |

Do not commit real database backups, deployment secrets, production session cookies, or verbose account/password dumps. Existing diagnostic scripts such as `scripts/check-auth.ts` print account records; remove/redact those behaviors before handoff. Local fixture credentials are demo credentials and should be clearly labelled as such.

Preserve the official source files and record their hashes. Reviewed repository hashes:

```text
fixtures.json  252896bc45d49fca69ad413be40c6bfde9d9b9f9dd8db702b3ff74eaaa181121
run.py         aa98963841bc8e18e8e5d76f0499697c093dd3c0055f9d73a459f592f4dcf09d
spec.md        644b92eb50a37215cb992589e451850ab95cb14803bbad3905fd8b071bfbd696
```

Reference sources:

- Official main site: https://dogfoodhack.com/
- Official contract: https://dogfoodhack.com/spec/
- Reviewed repository: https://github.com/tinubaby006/kryPsis-dogfood/tree/fb4a41143f1da55984d51a7871ee4fadb7d80f5d
- Official files inside that revision: `docs/official/`.
- Team's two uploaded reports, including their exact SQL and master requirements.

The official spec requires a working local seeded portal, root assessment configuration, genuine acceptance report, license and supporting documentation. Its seven checks are intentionally narrow. They do not validate your normalization mathematics, imported timestamp truth, lifecycle UI, snapshot immutability, or restart safety. Those are why this plan includes the additional gates.

## 10. What you should do now

1. Follow section 2 to regenerate your current local sessions and save a fresh report.
2. Save this file and both attachments into the project paths in section 6.
3. Back up your existing database without wiping it.
4. Start a new Antigravity chat; give the bootstrap prompt, then Phase 0.
5. Execute phases sequentially and keep actual evidence in the status file.
6. Claim the completed tier only after the final workflow, offline and regression gates.

The acceptance failure has a verified recovery path. The remaining work is primarily making the fresh installation, imported evidence, judge experience and judging lifecycle as reliable as that acceptance result.
