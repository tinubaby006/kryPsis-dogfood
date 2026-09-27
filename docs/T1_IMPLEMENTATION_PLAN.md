# DOGFOOD T1: beginner setup, database design, and Antigravity implementation plan

Prepared 25 September 2026. Target: a complete T1 foundation, with imported judging data preserved for T2. This is an implementation specification, not a claim that an application has already been built or tested. Your existing blank Next.js project was not provided for inspection; use the prompts below inside that project.

## 1. Start here

Use Next.js App Router + TypeScript + PostgreSQL + Prisma + Better Auth + Tailwind + shadcn/ui. Keep one Next.js application with Route Handlers and server-only business services. Use local PostgreSQL through Docker. There is no need to install PostgreSQL separately on Windows, configure a cloud database, or build a separate Express server.

The organizers granted you permission to prebuild the first phase, according to your message. This plan treats that as authorization for T1. Preserve the written exception and disclose the scope of early work honestly; do not change commit dates. General public rules still describe event-window coding.

Read Sections 2–5 first. Complete the machine setup in Section 6. Put this document and the official files into the project. Give Antigravity the master prompt in Section 14, then the stage prompts in order. Require a working checkpoint after every stage.

### Vocabulary

- **Database:** persistent structured records such as users, teams, and projects.
- **Schema:** the tables, fields, relationships, and rules defining those records.
- **Migration:** a versioned change that creates or updates the database structure.
- **Seed:** an import that fills a new database with initial data.
- **ORM/Prisma:** the TypeScript interface used to query PostgreSQL.
- **Authentication:** identifying who made a request.
- **Authorization:** deciding whether that person may perform this action on this particular record.
- **API endpoint:** a server URL that reads or changes data.
- **Docker image:** a packaged application and its dependencies.
- **Container:** a running instance of an image.
- **Volume:** storage that survives container recreation.
- **Fixture:** organizer-supplied sample input. It is not a mandatory database schema.
- **Idempotent seed:** running the import again does not duplicate records or erase user work.

## 2. What changed from our earlier discussion

The current spec and downloads are available now; there is no need to wait for kickoff to obtain them. The published checker contains seven assertions: three T1 and four T2. It does not exercise all the advertised features. Complete the product requirements, not merely the three assertions.

There are no prescribed API routes or database schema. `.dogfood.toml` tells the checker where your routes are. The checker does not log in; it sends supplied authentication headers. Bonuses are described in the new spec as tie-breakers, not additions to the weighted score. That corrects the earlier additive-bonus interpretation.

Sources: [spec page](https://dogfoodhack.com/spec/), [spec.md](https://dogfoodhack.com/spec/spec.md), [run.py](https://dogfoodhack.com/spec/run.py), [fixtures.json](https://dogfoodhack.com/spec/fixtures.json). The user-provided https://doogfoodhack.com/spec/ also returned the spec page during this review; use the original dogfoodhack.com download URLs consistently.

### Remaining ambiguities: do not invent organizer answers

1. Offline first installation: are Docker images prepared before internet is disconnected, or must you distribute an image archive? Build an offline-capable release regardless, and clarify the delivery method.
2. The runner cannot verify T3/T4 because it contains no checks for them. Ask how those claims should be represented when you reach those tiers.
3. The brief calls T1 the eligibility floor, but also rejects gallery-only products and asks for a create/submit/judge/publish video. Treat T1 as the current milestone and plan T2 next; do not assume a gallery-only final submission satisfies every stated expectation.
4. The narrative in spec.md mentions a Sunday submission in its example, whereas the main event schedule gives Monday September 28 at 18:00 UTC (23:30 IST). Follow official event announcements rather than the illustrative story.

## 3. Fixture audit: what the actual file contains

The counts below were computed from the downloaded JSON, not copied from the approximate website description.

| Item | Observed value |
|---|---:|
| Events | 1 |
| Tracks | 8 |
| Judges | 30 |
| Teams | 40 |
| Distinct team-member email addresses | 91 |
| Project records | 41 |
| Judge/project review records | 126 |
| Individual criterion values | 378 |

Event `evt_01` closes at `2026-03-01T18:00:00Z`. Preserve that date. All 41 submitted timestamps precede it. The first three project titles are `Glass Signal`, `Small Meadow`, and `Deep Compass`.

The duplicate is `prj_41`, matching `prj_07` on team `tm_07`, title `Dry Harbour`, and repository URL. Their IDs and submitted timestamps differ. Team names also repeat: StillTrail, AmberSwitch, and OpenSignal. IDs are unique strings. No judge/project score pair repeats in this snapshot. Each review has functionality, quality, and innovation values. Values observed range from 2 to 5; that does not prove the allowed scale starts at 2.

There are 26 projects with three reviews, eight with two, three with four, and four with five. All projects have at least one review. Judge `jdg_07` has three reviews with all criterion values equal to 4. `jdg_01` has only one review, with all values 2; that is insufficient evidence of a consistent scoring tendency. All observed reviews match the judge's declared track access.

**Important schema consequences:** do not make team name, project title, repository URL, or project.teamId unique. Preserve missing reviews as missing. There is no assignment/batch manifest in the file, so the exact unfinished assignments cannot be reconstructed from absent scores alone. Do not invent them.

Snapshot hashes (SHA-256):

- fixtures.json: `252896bc45d49fca69ad413be40c6bfde9d9b9f9dd8db702b3ff74eaaa181121`
- run.py: `aa98963841bc8e18e8e5d76f0499697c093dd3c0055f9d73a459f592f4dcf09d`
- spec.md: `644b92eb50a37215cb992589e451850ab95cb14803bbad3905fd8b071bfbd696`

A different hash later may mean an organizer update. Compare contents and revise the importer/plan; do not silently overwrite a reviewed snapshot.

## 4. What run.py actually does

Source inspected: the complete downloaded run.py, including configuration parsing, requests, checks, fixture lookup, tier reduction, and exit behavior.

| Assertion | Actual behavior | Our implementation response |
|---|---|---|
| Public gallery | GET without authentication; expects HTTP 200 | Server-render the public gallery |
| Fixture presence | Reuses that response, searches case-insensitively for any of the FIRST THREE fixture titles | Default fixture-gallery order by ID ascending, first page includes prj_01–prj_03 |
| Deadline | POSTs JSON containing only title and summary; sends participant header; accepts any 400–499 | Authenticate a real seeded participant, resolve evt_01 from URL, return 409 EVENT_CLOSED from the actual deadline rule |
| Own scores | Judge A GET; expects 200 | Future T2 endpoint with real authorized records |
| Peer scores | Judge B requests Judge A's route; expects 401 or 403 | Future backend authorization; never return peer records |
| Participant restriction | Participant requests judge scores; expects 401 or 403 | Future backend role check |
| CSV | Organizer GET; 200 and comma in first response line | Future real CSV exporter, not a fake comma response |

Additional code observations:

- Seven assertions use six HTTP calls: the gallery response is reused.
- Python performs HTTP requests; it does not run browser JavaScript. A client-only gallery populated after hydration can fail.
- Requests time out after 10 seconds. Use the built production app for final evaluation.
- Headers are supplied as one `Header-Name: value` string per actor. Cookie headers may contain multiple cookies; never copy Set-Cookie attributes such as Path into a request Cookie header.
- All seven assertions run even if `claimed = ["T1"]`. T2 failures during a genuine T1 milestone are expected and must stay in the report.
- A completed runner returns exit code 0 even when assertions fail. Inspect report text; CI must not equate exit 0 with all-pass.
- The runner requires consecutive lower-tier passes. It can verify at most T1/T2 in this version.
- An HTTP 404/405 or an invalid-login 401 could satisfy the deadline assertion accidentally. Our own tests must prove real authenticated deadline rejection and successful submissions to an open event.
- Keep run.py unchanged. Keep fixtures.json unchanged. Do not special-case the probe title, detect the checker user agent, or hardcode fixture titles into a fake response.

## 5. Scope: complete T1 versus later work

### Build now

1. Local email/password signup, login, logout, expiring sessions, persistent accounts.
2. Visitor, participant, judge, organizer, and admin access boundaries enforced server-side.
3. Organizer event creation/editing with configurable dates, tracks, prizes, and custom questions.
4. Team creation and joining through a copyable invitation link.
5. Draft project creation/editing, local image upload, final submission, and editing until the deadline.
6. A centralized deadline rule applied to every submission-related mutation.
7. Public database-backed gallery, project details, search, and filters.
8. Full fixture import, including historical review records, without enabling public score access.
9. Local persistence, Docker startup, real assessment credentials, and acceptance configuration.
10. Tests, documentation, and accurate scope reporting.

### Preserve data support now, implement functionality in T2

Judging assignments, rubric editing/weights, score entry, normalization, organizer judging progress, and stage-by-stage CSV exports. Importing historical scores or showing a restricted judge landing page is not T2 completion.

### Explicitly defer

Community voting/comments, certificates, signed records, webhooks, pairwise ranking, external AI integrations, chat, social login, and email delivery. The platform must work with no AI API. AI may help you write the code without becoming a runtime dependency.

## 6. Beginner Windows setup

### 6.1 Install/check tools

Use your existing project folder. Do not run create-next-app again inside it. Open that folder in Antigravity and a PowerShell terminal.

Install a supported Node.js LTS compatible with the project's dependencies (Node 24 LTS is a reasonable target; check engines), Git, Python 3.11 or newer, and Docker Desktop using its WSL 2/Linux-container setup. Python is for the checker, not the app backend. Check current Windows compatibility against Docker's requirements, especially if the laptop still runs Windows 10.

Official downloads/documentation:

- https://nodejs.org/en/download
- https://git-scm.com/downloads/win
- https://www.python.org/downloads/windows/
- https://docs.docker.com/desktop/setup/install/windows-install/

Check WSL with `wsl --version`. If absent, use an administrator PowerShell to run `wsl --install`; restart if requested. If installed but outdated, run `wsl --update`. Start Docker Desktop and wait for its engine to be ready. Docker's Windows guide describes the exact supported OS and virtualization requirements.

In a new regular PowerShell terminal run:

```powershell
node --version
npm --version
git --version
py --version
docker --version
docker compose version
docker info
```

Expected: all commands print versions/info; docker info shows a working server. A client version alone does not prove Docker is running. If `py` is unavailable but `python --version` works, substitute `python` in this guide. Avoid changing machine-wide execution policies; if PowerShell blocks npm.ps1, use `npm.cmd`.

### 6.2 Prepare the existing repository

Run from the directory containing package.json:

```powershell
Get-Content package.json
git status
```

If the folder is not a Git repository, run `git init`. Preserve existing files and lockfile. Use npm only if the project uses package-lock.json or has no selected package manager; keep pnpm/yarn if already used and translate commands consistently.

Create `docs/official`, then download the official files while online:

```powershell
New-Item -ItemType Directory -Force docs/official
Invoke-WebRequest https://dogfoodhack.com/spec/spec.md -OutFile docs/official/spec.md
Invoke-WebRequest https://dogfoodhack.com/spec/run.py -OutFile docs/official/run.py
Invoke-WebRequest https://dogfoodhack.com/spec/fixtures.json -OutFile docs/official/fixtures.json
Get-FileHash docs/official/fixtures.json -Algorithm SHA256
```

Save this guide as `docs/T1_IMPLEMENTATION_PLAN.md`. Antigravity must read these local files. They provide the context absent from its conversation.

### 6.3 Let Stage 0 select and pin dependency versions

Do not blindly paste old Prisma tutorials into a new setup. Use matching versions of prisma, @prisma/client, and the PostgreSQL adapter. Prisma 7 uses its current config/adapter setup; older major-version snippets differ. Generate Better Auth's models from the installed auth configuration, then apply migrations through Prisma. Better Auth's Prisma CLI generation does not itself migrate PostgreSQL.

Package inventory for Antigravity to install and lock:

- Runtime: better-auth, @prisma/client, @prisma/adapter-pg and pg if required by selected Prisma, zod, lucide-react, required shadcn dependencies.
- Development: prisma, tsx, Vitest, Playwright, relevant types, compatible auth schema-generation CLI.
- Existing: Next.js, React, TypeScript, Tailwind; preserve compatible versions rather than upgrading unnecessarily.

Sources: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 ; https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding ; https://better-auth.com/docs/adapters/prisma .

### 6.4 Development database through Docker

Ask Stage 1 to create this database-only `docker-compose.dev.yml`. This is a proposed local development configuration, not a claim about an existing file:

```yaml
services:
  db:
    image: postgres:17-bookworm
    environment:
      POSTGRES_USER: dogfood
      POSTGRES_PASSWORD: dogfood_local_dev
      POSTGRES_DB: dogfood
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - dogfood_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dogfood -d dogfood"]
      interval: 3s
      timeout: 3s
      retries: 20
volumes:
  dogfood_pgdata:
```

Use the same Postgres major version and named volume in final Compose. Resolve and pin the image digest for release. Do not change major versions against an existing volume. The sample password is intentionally local demo configuration, not a production credential.

Create `.env` for local development (ignored by Git). Antigravity should create `.env.example` documenting each variable. Example:

```dotenv
DATABASE_URL=postgresql://dogfood:dogfood_local_dev@localhost:5432/dogfood?schema=public
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=REPLACE_WITH_RANDOM_SECRET
APP_URL=http://localhost:3000
SEED_DEMO=true
ASSESSMENT_MODE=true
UPLOAD_DIR=./storage/uploads
```

Generate the auth secret in PowerShell after Node is installed:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the result into BETTER_AUTH_SECRET. Keep it stable between restarts. Prisma CLI must explicitly load `.env` as required by the selected version; do not assume it reads Next.js's `.env.local`.

After Stage 1 has created the schema and scripts:

```powershell
docker compose -f docker-compose.dev.yml up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Those npm scripts do not exist in a blank Next.js project. Antigravity must implement them before you run this sequence. Open http://localhost:3000. The database itself has no web page; inspect it with Prisma Studio if needed.

**Hostnames:** Next.js running directly on Windows connects to `localhost:5432`. Next.js inside Compose connects to `db:5432`. Inside the application container, localhost means the application container, not PostgreSQL.

Stop development with Ctrl+C and `docker compose -f docker-compose.dev.yml stop`. Avoid `down -v`: it removes the database volume. Do not run development and full release configurations simultaneously against conflicting ports.

## 7. Database schema: authoritative design contract

These are implementation decisions, not an organizer-prescribed schema. Antigravity must translate them into a complete, validated Prisma schema and SQL migrations. Use explicit relations; no unchecked string references masquerading as foreign keys.

### Shared conventions

- IDs: PostgreSQL text / Prisma String, generated with cuid/UUID as TEXT for new application rows. Preserve fixture IDs such as evt_01 and prj_41. Do not use PostgreSQL UUID columns for fixture IDs.
- Dates: DateTime mapped to timestamptz; keep UTC instants.
- Core records: createdAt and updatedAt. Imported submittedAt is separate and preserved.
- Money: Decimal, not floating point. Scores/weights: Decimal where fractions may be needed later.
- JSON is for variable question answers/options or raw evidence, not replacing all relational tables.
- Prefer restrict/archive for business records; do not cascade-delete events, teams, or projects containing evidence.
- Fixture IDs are unique in this imported dataset. Live-generated IDs must not reuse them.

### 7.1 Authentication and roles

| Model | Required fields and constraints |
|---|---|
| User | Better Auth-generated fields: id, name, normalized unique email, emailVerified, image?, timestamps; add isPlatformAdmin default false, canCreateEvents default false. Never accept these privilege fields from public signup input. |
| Session | Use exact generated Better Auth model, including user relation, unique session token and expiry. Do not hand-roll browser cookies. |
| Account | Use generated model for credential account/password hash and provider fields. Never store plaintext passwords in User. Preserve library-required account uniqueness. |
| Verification | Use generated Better Auth model even if email verification is not enabled in the local demo. |
| EventRole | id, eventId, userId, role enum PARTICIPANT/JUDGE/ORGANIZER, timestamps. Unique(eventId,userId,role). Multiple event roles are representable; access is evaluated per action. |
| AssessmentCredential | id, userId FK, unique tokenHash, label, expiresAt, revokedAt?, createdAt. Local assessment bearer credentials described in Section 9. No plaintext token in DB. |

Visitor is absence of an authenticated session, not a stored role. Platform admin is explicitly global. Ordinary signup gives no organizing/admin authority. Seed a known organizer with canCreateEvents=true; admin UI can grant that capability. Creating an event grants its creator ORGANIZER for that event. An organizer role for one event does not grant access to others.

### 7.2 Event and team models

| Model | Required fields and constraints |
|---|---|
| Event | id, slug unique, name, description default empty, startsAt?, endsAt?, submissionsOpenAt?, submissionsCloseAt required, visibility enum DRAFT/PUBLIC default DRAFT, maxTeamSize default 4 as a configurable product choice, createdById User FK, fixtureSource?, timestamps. Validate open < close and start <= end when present. |
| Track | id, eventId FK, name, description default empty, sortOrder. Unique(id,eventId) for composite references; unique(eventId,name) acceptable for track names. |
| Prize | id, eventId, name, description, amount Decimal?, currency?, sortOrder. Amount nonnegative when present; amount/currency provided together. |
| CustomQuestion | id, eventId, key, label, type TEXT/LONG_TEXT/URL/NUMBER/SELECT/BOOLEAN, required default false, options JSON?, isPublic default false, sortOrder. Unique(eventId,key), unique(id,eventId). Freeze structural edits after submissions exist; labels may be corrected without changing meaning. |
| Team | id, eventId FK, name, createdById User FK, timestamps. Unique(id,eventId). Name is NOT unique. |
| TeamMember | id, eventId, teamId, userId, role OWNER/MEMBER, joinedAt. Composite FK(teamId,eventId) -> Team(id,eventId). Unique(teamId,userId), unique(eventId,userId). This implements the chosen one-team-per-user-per-event rule. |
| TeamInvite | id, eventId, teamId, unique tokenHash, createdById, expiresAt, revokedAt?, maxUses, uses default 0, createdAt. Composite team/event FK. Token appears in the copied URL only; database stores hash. |
| JudgeTrack | eventId, userId, trackId. Composite PK(eventId,userId,trackId); composite FK(trackId,eventId). Require corresponding EventRole JUDGE in service layer. |

One owner per team: add a PostgreSQL partial unique index on teamId where TeamMember.role='OWNER'. Create team+owner+participant role in one transaction. Owner transfer/removal is deferred; do not build a leave action that creates an ownerless team. Lock the team row while checking capacity and consuming invites. Repeated join by an existing member is idempotent and must not consume another use.

### 7.3 Projects and uploads

| Model | Required fields and constraints |
|---|---|
| Project | id, eventId, teamId, trackId?, title default empty, summary default empty, description default empty, repoUrl?, liveUrl?, demoVideoUrl?, techTags String[] default [], status DRAFT/SUBMITTED, submittedAt?, version Int default 1, duplicateOfId?, source LIVE/FIXTURE, timestamps. Unique(id,eventId). Composite team/event and track/event foreign keys. No unique(teamId), unique(repoUrl), or unique(title). |
| ProjectAsset | id, eventId, projectId, kind THUMBNAIL/GALLERY, unique storageKey, originalName, mimeType, bytes, sortOrder, createdById, createdAt. Composite FK(projectId,eventId). At most one THUMBNAIL per project through a partial unique index. |
| CustomAnswer | projectId, questionId, eventId, value JSON. PK(projectId,questionId); composite FKs to Project and CustomQuestion with eventId. |
| AuditLog | id, eventId?, actorUserId?, action, entityType, entityId, safe metadata JSON, createdAt. Index(eventId,createdAt). No session tokens, passwords, or full private form payloads. |

Use project.version for optimistic concurrency: updates include expectedVersion, conditionally increment it, return 409 STALE_VERSION when another teammate saved first. Do not silently overwrite their work.

Drafts allow incomplete content. For new live submissions, require nonblank title/summary/description, a valid track belonging to the event, repository URL, and required custom answers. Other media/link fields remain optional in this proposed policy; adjust if organizers specify otherwise. Validate HTTP/HTTPS URLs and lengths. Do not fetch arbitrary submitted URLs on the server.

Fixture records lack long description/media/custom answers. Import them as historical SUBMITTED records with missing fields empty/null. They are not subject to today's live form completeness rules. No invented descriptions or fabricated media.

Allow multiple project records per team; current official data demonstrates why a DB-level one-project restriction is wrong. Show a project list in the participant dashboard. Flag possible duplicates for organizer review; do not auto-delete, merge scores, or disqualify them. For the fixture, record prj_41.duplicateOfId=prj_07 as an inferred duplicate flag with provenance. Guard self-reference/cycles and keep the original payload.

### 7.4 Preserve judging input without claiming T2

| Model | Required fields and constraints |
|---|---|
| Criterion | id, eventId, key, label, weight Decimal? default null, minScore Decimal? default null, maxScore Decimal? default null, sortOrder. Unique(eventId,key), unique(id,eventId). Import fixture keys; no official weights/range are supplied. |
| Review | id, eventId, judgeUserId, projectId, comment default empty, source FIXTURE/LIVE, createdAt, updatedAt. Unique(eventId,judgeUserId,projectId), unique(id,eventId); composite FK(projectId,eventId). |
| CriterionScore | reviewId, criterionId, eventId, value Decimal. PK(reviewId,criterionId); composite FKs to Review and Criterion with eventId. |
| FixtureImport | id, sourceName, sourceSha256, importedAt, counts JSON, rawPayload JSON. Unique(sourceName,sourceSha256). |
| ImportIssue | id, importId FK, severity, code, entityType, entityId?, details JSON, createdAt. Capture inferred duplicates or future malformed inputs. |

Review scores have no supplied creation timestamps. Record import time as import provenance, not as the historical time a judge submitted a review. The original file remains authoritative evidence.

For T2, add JudgeAssignment with explicit assignment status/timestamps and versioned rubric configuration. Existing reviews prove reviews happened; missing rows do not prove which assignments were made. Do not manufacture pending assignments from every judge-track/project combination.

### 7.5 Required database enforcement

Implement and inspect SQL migration constraints, including composite foreign keys, uniqueness, nonnegative invite counters, positive team limits, and partial unique indexes. Where Prisma cannot express a partial index/check directly in the selected version, use reviewed migration SQL. Validate event consistency in the service layer too.

Index Project(eventId,status,trackId,id), Project(teamId), TeamMember(userId,eventId), EventRole(userId,eventId), Review(eventId,judgeUserId), Review(projectId), and AuditLog(eventId,createdAt). The fixture dataset is small; simple case-insensitive database search is sufficient.

## 8. Import procedure and demo event

Seed order, inside an import transaction where practical:

1. Read the bundled JSON from disk; calculate SHA-256 and validate keys, unique IDs, reference integrity, timestamps, criterion shapes.
2. Ensure a seed organizer account exists using the chosen auth library's supported password/account creation mechanism.
3. Create evt_01 with the exact provided close date, PUBLIC visibility, and clearly documented defaults for absent fields. Do not invent an official start date.
4. Insert tracks; create judge users and event roles; preserve judge IDs as User IDs or maintain an explicit source-ID mapping. This plan prefers User.id=jdg_XX for imported judges. Apply JudgeTrack relations.
5. Create participant users from the 91 distinct member emails, with stable generated IDs and display names derived from email as documented fallback. Members are not automatically judges.
6. Insert teams. Since fixture members have no ownership metadata, choose the first listed member as demo owner and document that inferred default. Add memberships and participant roles.
7. Insert all 41 projects with original IDs and submittedAt, including the duplicate. Preserve original URLs/title/summary.
8. Insert three criteria, 126 reviews, and 378 criterion values. Leave unspecified criterion weights/ranges null.
9. Record raw payload, import metadata, and duplicate warning. Do not expose scores through public project DTOs.
10. Create a separate PUBLIC event such as `demo_open_01` with a deadline seven days after its initial creation. Do not extend it on every restart. Organizer can edit or create a new demo event when it expires. Give it tracks and custom questions for manual workflow tests.

On repeated startup: verify imported IDs exist and skip an already-completed identical import. Never truncate tables or reset user edits/passwords/submissions. If the fixture hash changes, stop with an actionable import-version message rather than silently merging incompatible data. Recovery/replace commands must be explicit, documented, and limited to disposable demo data.

Provide organizer-readable import results, but an elaborate import dashboard is unnecessary for T1. A simple organizer diagnostics view plus console summary is enough.

## 9. Authentication that works for both humans and run.py

Humans: use Better Auth's local credential flow and normal session cookies. Use correct origin/CSRF settings, secure cookie behavior in HTTPS deployments, and development-safe localhost configuration. Disable mandatory email verification for the offline demo; do not pretend unverified addresses are verified.

Checker: implement explicit API bearer credentials for seeded demo accounts, backed by AssessmentCredential. This avoids inventing Better Auth cookie signatures or committing expiring browser-cookie examples.

- Four credential identities: seed organizer, jdg_01 as judge_a, jdg_02 as judge_b, and first member of tm_01 as participant.
- Credentials are long random-looking local demo secrets generated once for the assessment bundle, never the role name itself. Store hashes in the database.
- On startup, create/renew demo credential records with a documented finite expiry sufficient for the judging window. Print the four actual Authorization headers when ASSESSMENT_MODE=true. Keep configured demo credentials stable so the committed assessment file works after a clean local seed.
- A shared authentication resolver verifies either the normal session or a valid bearer token and returns a User. Apply the SAME event/ownership/deadline checks afterward. A token does not grant special bypass permissions.
- Reject ambiguous conflicting credentials. Invalid/expired/revoked tokens return 401.
- Assessment mode is explicitly local demonstration mode. Production configuration disables these seeded credentials and does not print secrets. Local Compose binds the website to 127.0.0.1. Demo secrets are intentionally disposable and documented; never use a real account credential.
- Browser cookie mutations still need normal CSRF/origin protection. The dedicated bearer API path accepts the checker's request without a browser Origin header because bearer credentials are explicitly supplied, not ambient browser cookies. Do not disable CSRF globally to make a test pass.

Generate `.dogfood.toml` from the actual local demo credential configuration after seeding. Do not submit placeholders. Proposed route mapping:

```toml
[portal]
base_url = "http://localhost:3000"

[tiers]
claimed = ["T1"]
pitch = "An offline hackathon portal with reliable team submissions and explicit permissions."

[auth]
organizer = "Authorization: Bearer REPLACE_WITH_ACTUAL_LOCAL_ORGANIZER_TOKEN"
judge_a = "Authorization: Bearer REPLACE_WITH_ACTUAL_LOCAL_JUDGE_A_TOKEN"
judge_b = "Authorization: Bearer REPLACE_WITH_ACTUAL_LOCAL_JUDGE_B_TOKEN"
participant = "Authorization: Bearer REPLACE_WITH_ACTUAL_LOCAL_PARTICIPANT_TOKEN"

[routes]
gallery = "/events/evt_01/projects"
submit = "/api/events/evt_01/projects"
judge_scores = "/api/events/evt_01/judge/scores"
peer_scores = "/api/events/evt_01/judges/jdg_01/scores"
csv_export = "/api/events/evt_01/export.csv"
```

T2 URLs describe reserved implementation contracts; do not create pretend successful endpoints. During T1 they may return not-implemented/not-found and the untouched report will show T2 failures. Claim only T1. A restricted judge dashboard can honestly state that scoring is not implemented yet.

## 10. Routes, screens, and behavior

These paths are our choices. The organizer does not prescribe them. Antigravity should implement these consistently unless the existing project has a reason to adapt them; document any mapping change.

### Screens

| Path | Behavior |
|---|---|
| / | Event listing with fixture event visibly closed and separate open demo event |
| /sign-in, /sign-up | Accessible credential forms; useful validation and errors |
| /dashboard | Current user's events, teams, projects, draft/submitted status |
| /organizer | Owned/managed events only; create event if authorized |
| /organizer/events/new | Dates, tracks, prizes, custom-question configuration |
| /organizer/events/[eventId] | Event settings, teams and submissions, simple import diagnostics |
| /events/[eventId] | Public event description, dates, tracks/prizes, join/create team CTA |
| /events/[eventId]/team | Current team and invitation management |
| /invite/[token] | Safe preview; login continuation; explicit POST acceptance (GET must not join) |
| /events/[eventId]/projects/new | Create draft for user's team |
| /projects/[projectId]/edit | Protected editor with version, save status, deadline notice |
| /events/[eventId]/projects | Public server-rendered gallery with search/track/tag filters |
| /projects/[projectId] | Public submitted project details; draft returns 404 to unauthorized readers |
| /judge | Authenticated, role-restricted landing page; no fake judging functionality |
| /admin | Platform-admin-only organizer capability management |

Visual direction: clear light workspace, readable typography, restrained accent color, compact navigation, accessible form labels, consistent shadcn components, responsive tables/cards. Use saved-state indicators and inline errors. No decorative charts with fake data, empty CTA buttons, or elaborate landing-page animations at the expense of working forms.

### API contracts

Use JSON responses `{data: ...}` on success and `{error: {code, message, fields?}}` on failure. API routes return status codes, not HTML login redirects. Public DTOs must explicitly select permitted fields.

| Method/path | Contract |
|---|---|
| GET /api/health | 200 only when application and database are ready; no secrets |
| /api/auth/[...all] | Better Auth handlers for supported methods |
| GET/POST /api/events | List public events / create event with permission |
| PATCH /api/events/[eventId] | Organizer/admin edits for this event |
| POST /api/events/[eventId]/teams | Create team+owner+participant role atomically |
| GET /api/events/[eventId]/team | Current user's team only |
| POST /api/teams/[teamId]/invites | Owner creates expiring copyable invitation |
| DELETE /api/teams/[teamId]/invites/[inviteId] | Owner revokes invitation |
| POST /api/invites/[token]/accept | Authenticated join with team locking/capacity checks |
| GET /api/events/[eventId]/projects | Public submitted projects with allowlisted fields, pagination/filter metadata |
| POST /api/events/[eventId]/projects | Create draft; event context in path; for closed fixture event reject before completeness validation |
| GET /api/projects/[projectId]/edit | Authorized editor data including private custom answers |
| PATCH /api/projects/[projectId] | Team-member edit using expectedVersion; validate event, track, deadline |
| POST /api/projects/[projectId]/submit | Validate completeness, set SUBMITTED/submittedAt in a transaction |
| POST /api/projects/[projectId]/assets | Authorized bounded image upload subject to same deadline |
| DELETE /api/projects/[projectId]/assets/[assetId] | Authorized deletion subject to same deadline |
| GET /api/assets/[assetId] | Serve publicly only for public submitted projects; authorize drafts |
| POST /api/admin/organizers | Admin-only grant/revoke canCreateEvents, with audit entry |

Event configuration can be a transactional aggregate save including tracks/prizes/questions. Do not delete referenced tracks. Once an event has submitted projects, freeze structural custom-question changes for T1 rather than inventing complex versioning.

### Deadline transaction

Choose one documented boundary: submissions are open when openAt is null or now >= openAt, and now < closeAt. Equality with closeAt is CLOSED.

For each project mutation: authenticate; resolve event from actual resource; authorize role/team; lock/read event deadline and resource within the transaction; evaluate database time at the mutation decision (after acquiring locks, not a stale browser timestamp); validate operation; write. Lock event edits consistently too. Define acceptance by the time of the authoritative write decision, not by whether an HTTP response arrived before the deadline.

For the checker payload, valid fixture participant + evt_01 + closed deadline produces 409 EVENT_CLOSED before required-field validation. New-project requests to the open demo event must work normally. Do not test only failure paths.

Submitted project edits preserve the original submittedAt and remain submitted; validate they still meet submission requirements. Changing to an incomplete record is rejected. All edits stop at closeAt. Custom answers and image changes share the same rule.

### Upload policy (our chosen limits)

Allow JPEG, PNG, and WebP; verify file signatures, not just extension. Maximum 5 MB per image, one thumbnail and six gallery images. Reject SVG/HTML and executable content. Use random server storage keys; never join untrusted filenames into paths. Store files in a volume, not public/. Authorize retrieval of draft images; sanitize original filename in download headers. Stream with correct MIME and nosniff. Clean up files if DB insertion fails. Remote links are displayed without server-side downloading.

## 11. Offline release and npm script contract

Antigravity must create these scripts with meanings matching the selected package versions:

| Script | Meaning |
|---|---|
| dev | Next.js development server |
| build / start | Production build / production server |
| db:generate | Generate Prisma client |
| db:migrate | Development migration workflow; never automatic destructive reset |
| db:deploy | Apply committed migrations non-interactively |
| db:seed | Validate/import fixtures and initialize demo data idempotently |
| db:studio | Optional local Prisma Studio |
| typecheck | TypeScript without emit |
| lint | ESLint CLI configured for this Next.js version |
| test | Business/API tests using an isolated test database |
| test:e2e | Playwright user journeys |
| assessment:config | Produce actual local checker config from seeded assessment setup |

Do not put `npm install`, `npx ...@latest`, package downloads, font downloads, Playwright installation, or image pulls into container startup. Build/install while online. Generated Prisma client, migrations, seed runner, fixture files, auth configuration, and local assets must be inside the built application image.

Final `docker-compose.yml`: app + db (and an optional one-shot initializer if needed). Database healthcheck gates initialization. App waits for successful migrations/seed, then serves production Next.js on 0.0.0.0 internally, mapped to 127.0.0.1:3000 on the host. Use persistent DB/upload/config storage. No anonymous ephemeral database. Release startup generates or reuses a stable local auth secret automatically; judges should not manually assemble `.env` to run the demo. A production profile uses operator-supplied secrets and disables demo credentials.

App container DATABASE_URL uses host `db`. Browser auth/base URL stays `http://localhost:3000`; do not set the browser auth URL to `http://app:3000`.

Offline packaging procedure:

1. Build a tagged app image while online and obtain the pinned PostgreSQL image.
2. Start from empty disposable volumes, run migrations/seed, verify health and gallery.
3. Export both images to an archive with `docker image save` if judges need an offline bundle. Match judge architecture (ask whether amd64/arm64); do not assume an amd64 archive supports every laptop.
4. Provide checksums, exact image names, and `docker image load` preparation instructions. Put large archives in a release attachment, not normal Git history.
5. Disconnect internet after images are present. `docker compose up` must start successfully without building/downloading anything.
6. Test empty-volume offline startup as well as warm restart. Keep the normal application DB intact by using an isolated Compose project and volumes for destructive clean-install tests.

A source repo alone cannot contain all remotely downloaded dependencies by magic. Explicitly clarify whether the judges prepare images online or accept the archive. Do not market a warm-cache test as proof of a completely fresh offline install.

## 12. Tests and completion evidence

Run tests against a dedicated disposable test database; never reset your working database automatically.

| Area | Required tests |
|---|---|
| Import | Exact fixture entity counts; duplicate records retained; original deadline unchanged; two seed runs preserve user-created records |
| Authentication | Signup/login/logout; incorrect password; expired/invalid session; forged assessment token |
| Roles | Participant cannot self-promote; organizer cannot edit another event; judge cannot access organizer/admin APIs |
| Teams | Owner creation atomic; duplicate join idempotent; expired/revoked invite; full-team join; two concurrent joins into last slot |
| Drafts | Incomplete draft persists; cross-team reads/writes denied; private answers/assets excluded from public DTOs |
| Submission | Valid open-event submission succeeds; incomplete submit gives field errors; same-event track/question validation |
| Deadline | Just before/exactly at/after boundary; open browser after expiry; PATCH/upload/delete/submit all enforced |
| Concurrent editing | Stale expectedVersion produces 409 and preserves newer content |
| Gallery | SSR body has fixture title; search/filter works; drafts absent; changed submissions reflected without stale cache |
| Uploads | File-size/MIME/signature limits; filename traversal attempt; draft asset authorization |
| Runtime | Fresh seed, restart persistence, offline startup with prepared images; health waits for DB readiness |

Run the official runner unmodified after application startup. From Windows project root:

```powershell
py docs/official/run.py .dogfood.toml --fixtures docs/official/fixtures.json | Out-File -Encoding utf8 acceptance-report.txt
Get-Content acceptance-report.txt
```

The UTF-8 output avoids Windows PowerShell's older default file encoding. Keep TOML UTF-8 without BOM. For Linux/macOS use python3 and normal output redirection.

At the T1 checkpoint the report should show all three T1 assertions PASS, claim T1, and transparently show current T2 results. Automated report validation must inspect those T1 lines, not merely `$LASTEXITCODE`. Keep the official report raw; place additional test summaries in docs/T1_CHECKLIST.md.

## 13. Deliverables and handoff

### Organizer-facing final submission

- Public GitHub repository and OSI-approved license (MIT is a simple choice).
- Root docker-compose.yml and Dockerfile(s); one-command seeded local runtime.
- Root .dogfood.toml with real local demo credentials and accurate claims.
- Root acceptance-report.txt from the untouched official runner.
- README.md: prerequisites/preparation, startup, URLs, demo logins, offline procedure, implemented tiers, gaps, troubleshooting, video link.
- ARCHITECTURE.md: request flow, services, authentication, authorization, volumes, startup, deployment assumptions.
- DATA-MODEL.md: schema, composite constraints, duplicate treatment, field mappings, import/export paths and current export limitations.
- JUDGING.md: explicitly state T1-only when applicable; explain imported review preservation. Later add actual assignment, rubric and normalization design. Do not claim algorithms not implemented.
- Five-minute final lifecycle demo. At T1 you can record create/team/draft/submit/gallery; the required judging/publish portion belongs to later implementation and must not be faked.

### Engineering files I recommend adding

- docs/official/{spec.md,run.py,fixtures.json}, checksums and retrieval date.
- prisma/schema.prisma, prisma.config.ts when required, migration SQL, seed/import code.
- Lockfile, .env.example, .dockerignore, .gitignore, LF line-ending rules for shell scripts.
- docs/DECISIONS.md, docs/T1_CHECKLIST.md, tests, demo-data documentation.
- Development Compose configuration, assessment-config generator, offline image preparation instructions.
- A concise note about the organizer-authorized T1 prebuild. Keep personal/private correspondence private unless sharing is needed.

Never commit real secrets, node_modules, .next, raw database volumes, or local session dumps. Explicitly documented throwaway local assessment credentials are a separate demo artifact and must not be usable in production.

## 14. Antigravity master prompt — paste once

Copy the block below after adding this file and the official files to your existing project.

```text
You are implementing a real offline hackathon submission portal in an EXISTING blank Next.js project. Read docs/T1_IMPLEMENTATION_PLAN.md fully and docs/official/spec.md, docs/official/run.py, docs/official/fixtures.json before editing. You have no prior chat context; those files define the project.

The goal is COMPLETE T1, not merely passing three shallow checks. The owner reports explicit organizer permission to prebuild T1. Do not falsify Git history. Do not implement T2/T3/T4 UI now; preserve imported judging data for later.

Stack: Next.js App Router, TypeScript, PostgreSQL locally in Docker, Prisma, Better Auth local credential sessions, Tailwind/shadcn, Zod, Playwright/Vitest. One application, no separate Express service or external runtime APIs. Inspect existing package.json, lockfile and app layout. Preserve compatible versions and existing work. Pin dependency versions and document them. Check installed-version documentation before generating auth/Prisma configuration; do not mix major-version tutorials.

The implementation guide fixes our proposed schema, route contracts, auth policy, fixture strategy, file limits, and workflow defaults. If it conflicts with actual organizer source files, identify the precise difference in docs/DECISIONS.md and resolve deliberately. Do not silently replace requirements with simpler behavior.

Critical facts: actual fixtures contain 41 projects, 40 teams, 30 judges, 8 tracks, 126 reviews and 378 criterion values. prj_41 duplicates prj_07 semantically but is a distinct record. Never unique team names/project titles/repo URLs/project.teamId. Preserve historical close timestamp 2026-03-01T18:00:00Z and all fixture records. Create a separate open demo event. Keep official input/runner unchanged.

Authentication is real Better Auth for browsers. Assessment uses explicitly seeded, DB-verified demo bearer credentials with the same resource authorization. No user-controlled role headers, no fake cookies, no checker-specific bypass. Backend authorization must run on every protected operation. Protect drafts, assets and private custom answers. Use a server-rendered fixture gallery whose first response includes one of the first three actual fixture titles from DB.

Implement the provided stages one at a time when requested. After each stage: report changed files, migration/schema changes, exact commands actually run, test results, unresolved failures and next actions. Never claim execution or passing tests without evidence. Fix stage failures before adding optional features. Do not expose a test-reset route or silently delete user data. Use tests in a separate database.

No pretend completion: no hardcoded gallery masquerading as persistence, empty successful APIs, fabricated acceptance report, fake score math, or placeholder secrets in final .dogfood.toml. The runner exits 0 on failures; inspect report content. T2 failures are expected while claiming only T1.

Start with Stage 0 only. Produce the repository/dependency inspection and concrete implementation checklist; then perform the Stage 0 changes described in the guide. Do not attempt the entire app in one unreviewable change.
```

## 15. Stage prompts — send in order

### Stage 0 — inspect and establish the project

```text
Perform Stage 0 using the master instructions and guide. Inspect existing files and lockfile; retain the current Next.js project and package manager. Compute fixture counts/reference checks from the real JSON. Create docs/DECISIONS.md with package-version choices, source hashes, the 41-project duplicate, event-role design, import assumptions, and scope boundaries. Install a coherent pinned dependency set after checking Node/package compatibility. Configure lint/typecheck and local environment examples. Do not scaffold a second app or add product features yet. Verify the existing app builds or report the exact blocker. Show the Windows commands the owner needs to run next.
```

Checkpoint: existing application still starts; dependencies and source facts are documented.

### Stage 1 — database and schema

```text
Implement Stage 1. Create the development PostgreSQL Compose file and Prisma configuration for installed versions. Generate Better Auth's required base schema through its compatible CLI, merge the guide's application models, and create migration SQL for all FKs/checks/partial indexes. Include the historical review tables but no judging UI. Use String IDs and timestamptz; enforce event consistency with composite FKs; do not create uniqueness that rejects prj_41 or repeated team names. Create db:generate, db:migrate, db:deploy, db:seed and db:studio scripts with explicit environment loading. Validate schema and apply migrations to a disposable local database; inspect resulting constraints. If Docker is unavailable, say validation is blocked and give exact owner commands; do not claim migration success. Test cross-event FK rejection and duplicate-permitted project inserts.
```

Checkpoint: empty database can be created from committed migrations and accepts the fixture-compatible model.

### Stage 2 — auth, fixture import, and assessment credentials

```text
Implement Stage 2. Build real Better Auth signup/signin/signout/session handling, server-only identity resolution, event permissions and platform-admin protections. Import every fixture record using the ordering/defaults in the guide; create the separate open demo event and necessary local users. Implement repeat-safe import tracking and duplicate warnings. Create database-verified local assessment bearer credentials with finite expiry and shared authorization; enable them only in explicit demo mode. Print actual headers and implement assessment:config to write accurate .dogfood.toml. Do not invent cookie formats, bypass auth for known titles, expose fixture passwords as production secrets, or make public signup privileged. Test login/logout, invalid tokens, role denial, exact counts and two consecutive seeds without data loss. Show demo accounts and what was genuinely verified.
```

Checkpoint: real login works, fixture data is present, repeat startup is safe, assessment headers identify actual users.

### Stage 3 — event and team workflows

```text
Implement Stage 3 from the route/screen contracts. Organizer can create/manage only authorized events, with configurable dates, tracks, prizes and custom questions. Event creator gets an organizer relation. Admin controls canCreateEvents. Participants create teams and share random hashed-token invitations. Joining is a POST, requires login, validates expiry/revocation/capacity, and is transactional with row locking. Support one team per user/event and exactly one owner under the chosen policy. Freeze structural question edits after submissions; reject deleting referenced tracks. Build functional accessible forms and useful empty/error states. Verify two-account invite flow, concurrent final-slot joins, duplicate join, and cross-event organizer denial. Do not proceed with buttons that only simulate success.
```

Checkpoint: a user can create/join a real team in the open demo event; unauthorized event changes fail.

### Stage 4 — drafts, submissions, deadlines and media

```text
Implement Stage 4. Create project list/editor, incomplete draft save, complete submit, pre-deadline edits and version-based conflict handling. Use the centralized server transaction rule for POST/PATCH/submit/custom answers/media changes. Closed fixture event POST returns 409 EVENT_CLOSED for valid participant before completeness validation; do not special-case checker text. Preserve fixture dates and create no new fixture submissions. Open demo submissions must succeed. Implement local validated JPEG/PNG/WebP uploads with size/count limits, safe storage keys and protected draft retrieval. Public DTOs exclude private custom answers, emails and all scores. Test open success, closed failure, exact boundary, stale edits, cross-team access, cross-event tracks/questions, invalid upload and private assets.
```

Checkpoint: two teammates can edit safely; data persists; deadline enforcement applies to all write paths.

### Stage 5 — gallery and T1 product finish

```text
Implement Stage 5. Build the public event gallery/detail pages with server-rendered DB content, search and track/tag filters. For /events/evt_01/projects default ordering is fixture ID ascending so the first page contains prj_01–prj_03. Never hardcode titles as test bait. Show all 41 records across pagination, retain duplicate records, and restrict duplicate-review diagnostics to organizers. Exclude drafts and private fields/assets. Use dynamic data or correct invalidation so new submitted projects appear. Finish participant dashboard, organizer views, accessible responsive navigation, save states and errors. Judge landing states T2 is not implemented. Run complete organizer-to-team-to-submission-to-gallery browser flow plus draft leakage checks.
```

Checkpoint: full T1 user journey works and the raw gallery response is testable without JavaScript.

### Stage 6 — release packaging and actual acceptance report

```text
Implement Stage 6. Create production Docker image and root docker-compose.yml for app/database with health-gated migrations and idempotent seeding. Include generated client, required migration/seed tools and fixtures in image; no runtime installs/downloads. Persist PostgreSQL, uploads and stable local configuration; bind host port to loopback. Configure localhost auth correctly for browser and db hostname internally. Provide image-preparation and offline archive instructions and architecture assumptions. Test warm restart and clean-volume offline startup with prepared images using isolated disposable volumes. Generate real .dogfood.toml, execute untouched docs/official/run.py, save raw output as acceptance-report.txt, and inspect T1 PASS lines. Preserve expected T2 failures; never fake an all-green report. Run build/typecheck/lint and critical tests, then write README, ARCHITECTURE, DATA-MODEL, JUDGING and T1_CHECKLIST with exact verified behavior, limitations and next T2 work. Report any check not actually executed.
```

Checkpoint: one-command local release, all genuine T1 checks passed, persistent data, complete documentation, honest report.

## 16. Troubleshooting without losing data

| Symptom | First action |
|---|---|
| docker command missing | Install Docker Desktop; open a fresh terminal |
| Cannot connect to Docker daemon | Open Docker Desktop, wait for engine, inspect docker info |
| Port 5432 already allocated | Stop the conflicting service or use host port 5433 in dev Compose and update host DATABASE_URL; internal db remains 5432 |
| Prisma cannot connect | Confirm db healthy, hostname matches execution location, credentials/db name match |
| Changed Postgres password does nothing | Existing volume retains its initialized account; changing environment is not a password migration. Do not delete volume as the default fix |
| Auth redirects/cookies fail | Use localhost consistently, inspect base URL/origin/secret and cookie settings; avoid swapping 127.0.0.1 and localhost in browser URLs |
| Fixture gallery check fails | Inspect raw HTTP response, pagination and first three titles; make gallery server-rendered |
| Deadline check passes but feature broken | Test a valid submission to open event and assert explicit closed-event error with valid credentials |
| Script exits 0 but report contains FAIL | Read report; this is the runner's actual behavior |
| T2 fails at T1 milestone | Expected; keep claim T1 and document remaining work |
| Uploads disappear on restart | Correct persistent volume/storageKey configuration |
| Offline run fetches fonts/packages | Bundle assets and build dependencies before disconnecting; remove runtime installers |
| Shell script says bad interpreter | Save entrypoint scripts with LF line endings and correct executable permissions |

## 17. What to do immediately

1. Verify Node, Git, Python and Docker/WSL with Section 6 commands.
2. Download the three official files into your existing project.
3. Save this guide as docs/T1_IMPLEMENTATION_PLAN.md.
4. Paste the master prompt into Antigravity using your chosen Gemini model/settings.
5. Run Stage 0, then Stage 1; verify PostgreSQL and migrations before building the UI.
6. Continue through the stages. At each checkpoint, require evidence and keep a Git commit of working progress.

This guide defines the schema and implementation contract. It has not modified your local project, executed your application, or certified T1 completion. Those claims require the staged implementation and tests above.
