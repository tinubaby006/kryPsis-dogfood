# DOGFOOD T1 extension — after completed Stage 5, before Stage 6

Prepared 28 September 2026 IST. Add this file to your project as `docs/T1_EXTENSION_AFTER_STAGE_5.md`. Keep the original `docs/T1_IMPLEMENTATION_PLAN.md` alongside it. This extension supersedes conflicting instructions about organizer onboarding, judge access provisioning, home-page behavior, and visual design. It does not restart the project.

## 1. Current state and boundaries

User-reported facts: Stages 0–5 are complete; Stage 6 has not been requested. The initial page is empty and lacks visible data/dates. The user has independently implemented organizer event configuration. The interface needs a black/red redesign. The actual repository and screenshots have not been inspected here; all diagnoses must be established by Antigravity in the local project.

Preserve working event configuration, submissions, auth, routes, imported fixtures, uploads, and existing migrations. Make additive migrations only. Never reset the database to fix a missing card. Implement the extensions in Stages 5A–5F, then resume the original Stage 6 packaging/acceptance work. Do not claim T2 from judge-access provisioning alone.

The original plan already included configurable events and a populated root page. Their missing/incomplete behavior is a verification gap; preserve the user's implemented configuration and fix only remaining gaps. The original plan did not include the requested user-to-admin organizer application workflow; add it now.

## 2. Official-source recheck and interpretation

Reviewed the live main site, /spec, and the destinations of reference 4 and reference 5. Main-site T1 remains authentication/sessions; five actor types; configurable events; invitation-based teams; editable submissions; server-enforced deadlines; searchable public gallery. Judge invitations/assignments and scoring sit in T2. We deliberately bring judge-access provisioning forward as the user's requested extension.

Reference 4 describes submission contents. Reference 5 describes event setup, draft/publish, dates, custom questions and judging. Neither mandates participant-to-admin organizer approval. That approval flow is our chosen product policy.

The live main site now gives September 26–29, 2026, with submissions due September 29 at 18:00 UTC (23:30 IST). This replaces the old guide's schedule note. Do not confuse those competition dates with the fixture event's March deadline. Verify organizer announcements if scheduling matters.

The /spec checker is still a limited smoke check, not full product verification. Keep the official fixture/runner unchanged, honest claims, and real output. Recheck any newer official downloads by comparison; never overwrite the project's input snapshot silently.

Sources:
- https://dogfoodhack.com/
- https://dogfoodhack.com/spec/
- https://help.devpost.com/article/126-know-your-submission-steps
- https://guide.mlh.com/general-information/judging-and-submissions/hackathon-submission-portal/using-devpost

## 3. Give Antigravity this audit prompt FIRST

Do this before any redesign or migration. The report is useful for a follow-up review without sharing credentials. It must describe actual code and observed screens, not an imagined implementation.

```text
We have completed Stages 0–5 of docs/T1_IMPLEMENTATION_PLAN.md. Stage 6 is not started. I have already added organizer event configuration; preserve it. Read docs/T1_EXTENSION_AFTER_STAGE_5.md as the updated extension.

Perform Stage 5A: an inspection only. Do not modify application code, dependencies, migrations, schema, data, styles or official files. You may create docs/CURRENT_UI_AND_T1_AUDIT.md and screenshots of the local demo. Avoid destructive commands. Use existing local demo accounts, and do not include passwords, tokens, .env contents or private credentials in the report.

1. Inspect package.json, app/src layout, route handlers, middleware/proxy, auth resolver, server services, Prisma schema, applied migrations, seed/import logic and theme styles. Record exact relevant file paths.
2. Inventory every implemented page and API related to home, event discovery, organizer settings, team/invites, submissions, gallery, judge and admin. Record purpose, allowed roles, data source, loading/empty/error states, working actions and gaps. Mark anything not executed as unverified.
3. Start the existing development app if possible. Inspect root / as visitor, participant, organizer, judge and admin. Diagnose why it is empty: inspect real response/query, database/environment connection, event visibility, seed state, date filtering, cache/rendering, authentication gates, exceptions and CSS. Do not assume seeding is missing. Read-only compare total/public/closed/open event counts; never reseed/reset automatically.
4. Trace dates end-to-end: actual Prisma field -> selected query/DTO -> UI formatter. Identify UTC/local conversion and missing-value problems. Check whether closed fixture events are incorrectly filtered out or errors rendered as empty results.
5. Capture local demo screenshots at 1440x900 and 390x844: home, event detail, organizer settings, participant dashboard/editor, gallery, judge landing and admin. Never change screen content just to improve a screenshot. If browser automation is unavailable, describe the exact URLs/manual capture steps instead.
6. Explain current layouts: header/sidebar widths, page containers, typefaces, colors/tokens, card/table/forms, responsiveness, keyboard focus, overflow and contrast. Identify reusable components. Do not claim visual inspection when only reading source.
7. Map each full T1 requirement to its implementation, test/evidence, status and recommended small fix. Separate official minimums, user-requested extensions and later T2 work.
8. Inspect current event configuration carefully. List fields and capabilities already working; do not recommend replacing them wholesale.
9. Report schema additions needed for organizer applications and event-scoped judge grants/invitations. Reuse equivalent existing tables rather than creating duplicates.
10. Finish with an ordered minimal change list for Stages 5B–5F and existing tests to retain. Save the report, summarize findings, and stop. No implementation in this audit stage.
```

The owner can send `CURRENT_UI_AND_T1_AUDIT.md` and representative screenshots back for a design review. The remainder of this extension is implementable after the audit; no new permission round is required for ordinary fixes. Resolve naming differences against actual code and document the mapping.

## 4. Stage 5B — populated home, trustworthy dates, preserved configuration

### Diagnose before changing data

Inspect the real database connection, successful seed marker, event visibility flags, query filters and rendered HTML. A filter like closeAt > now hides the official closed event; a root query limited to current-user teams hides all events from a new user. Database errors must produce an error state with retry, not a misleading zero-event state. Fetch from real records and never hardcode event cards.

### Root page contract

`/` remains a public event-discovery page for every actor. It must not require login to see published events. An authenticated user additionally gets a compact personal action panel, not a blank replacement page.

Default filter: All published events, including closed ones. Additional tabs: Open submissions, Upcoming submissions, Closed. Search by event name; show the active filters and clear action. Use a stable server-rendered query, supported by real data. These categories describe the submission window, not the whole event lifecycle.

Desktop layout: 72px navigation; 1200–1280px centered content; compact heading band with intro left and real featured event right; event search/status toolbar; three-column event grid. At 768–1023px use two columns; below 768px one. Show real event information above the fold rather than a full-screen decorative hero. Use an event already returned by the query as featured, preferring one currently open; otherwise feature the next upcoming or most recent closed event. Do not invent live events.

Each card: event name, summary, submission status label, event dates when available, absolute submission deadline plus timezone, track count, and View event. Prize information uses saved values/currency; omit total when values cannot meaningfully be summed. No fabricated teams/participants/reviews counters.

| Actor | Personal actions |
|---|---|
| Visitor | Explore events, sign in, create account; Host an event leads to signup/signin with safe return path |
| Participant/user without capability | My workspace and Request organizer access; show own request state |
| Approved organizer | Manage my events and Create event; retain public browsing |
| Judge | My judging events with explicit event context; retain public browsing |
| Admin | Admin workspace and pending organizer-request count; retain public browsing |

Users may have multiple roles. Show permitted workspace links, not a single global role selector that grants permissions. Switching visible workspace is navigation only.

### Dates

Use one shared event-date/status component on cards, details and dashboards. Show event starts/ends separately from submissions open/close. Store instants in UTC. Add Event.timeZone only if absent, default UTC for existing imported events; for new events require an IANA timezone selection and label all datetime-local inputs with it. Use the project's existing reliable date library if present; otherwise add a timezone-capable library deliberately and pin it. Validate invalid/ambiguous DST local times; do not blindly append Z to a local input.

Use the saved event timezone for server-rendered dates, e.g. `29 Sep 2026, 11:30 PM (Asia/Kolkata, UTC+05:30)`. A local-time toggle is optional after hydration. Keep output deterministic on server/client. UI status may update on a minute timer, while mutation permission always checks current server/database time. Countdown is secondary to the absolute timestamp and never the authority.

| Condition | Label |
|---|---|
| now < submissionsOpenAt, if present | Opens [date/time] |
| openAt absent or reached, and now < closeAt | Submissions open; closes [date/time] |
| now >= closeAt | Submissions closed [date/time] |
| missing optional start/end | Event dates not provided; still display known submission deadline |
| missing required close date in bad legacy row | Schedule unavailable; deny submission, show organizer repair hint |

The fixture has a known March close date but no event start/end. Display that honestly. Do not copy current competition dates onto fixture events. The separate demo event's existing dates remain unchanged unless the organizer deliberately edits them. Never extend dates on each restart.

### Organizer configuration regression check

Retain current field names, routes and screens where workable. Verify persisted event name/description, start/end, submission window, tracks, prizes, custom questions, publication state and existing limits. Public pages must reflect saves without a stale cache. Protect cross-event writes. Keep referenced tracks and existing answers safe when changing configuration. Explain any blocked structural change in the form. An ordinary user sees Request access, not an event-create form that fails only after filling it out.

Acceptance: visitor and all four authenticated actor types see published events/dates; closed fixture visible; unauthorized drafts hidden; no fake data; saved dates match display; unauthorized event edits fail.

## 5. Stage 5C — user requests organizer access, admin decides

### Product policy

Organizer approval grants the ability to CREATE events. Event management remains scoped by that event's ORGANIZER relation. It never grants access to another organizer's event. Keep existing approved organizers working after migration; do not make them reapply.

Flow: authenticated user submits application -> admin sees pending queue -> admin approves/rejects with reason -> applicant sees outcome -> approved user can create an event -> creating the event assigns the creator its organizer role. No external email is required. Application status is available in the app.

### Screens and data

`/organizer-access`: clear explanation and compact application form. Fields: display name (from profile), account email read-only, organization/community name optional (max 160), proposed event name (max 160), event description/reason (50–1500 characters), optional website HTTP/HTTPS. Existing account email is the identity; do not grant a different email privileges from form input.

State-specific content: no request -> form; pending -> submitted timestamp/status and Withdraw; approved -> Create event and Manage events; rejected -> readable reason and reapply with revised information; withdrawn -> may submit again; capability revoked -> show revocation status with reapplication option. Rate-limit new requests (proposed three per user/day) and enforce one pending request per user in the database. User can see only their own history.

`/admin/organizer-requests`: pending-first table with applicant, proposed event, organization, submitted time and status. Detail panel contains the complete request, approve/reject actions and reason input. Confirmation identifies the exact user. Empty, loading and error states are distinct. Support keyboard access. Admin identity derives from authenticated server state, never a submitted role flag.

### Schema additions: adapt to existing equivalents

OrganizerAccessRequest:
- id String PK, applicantUserId User FK, organizationName?, proposedEventName, reason, websiteUrl?.
- status PENDING/APPROVED/REJECTED/WITHDRAWN.
- reviewedById nullable User FK; reviewedAt nullable timestamptz; decisionReason nullable text.
- createdAt, updatedAt; version integer default 1.
- Index(status,createdAt), index(applicantUserId,createdAt), partial unique(applicantUserId) WHERE status='PENDING'.

Keep User.canCreateEvents as the authoritative current capability if it already exists. Approved request is immutable decision history, not a permanent guarantee of current permission. Revocation sets capability false, records an audit reason, and prevents new event creation. Existing managed events stay manageable under their event roles; any suspension of those roles must be an explicit separate admin action. Do not automatically remove permissions from someone else's event.

Approval transaction: verify platform admin -> lock/recheck request is PENDING and version matches -> set request APPROVED and review metadata -> set applicant capability true -> write AuditLog. Reject/withdraw operate with equivalent state guards. Duplicate identical retry is idempotent; contradictory second decision returns 409. Pending requests cannot be edited behind a reviewing admin; withdraw/reapply is sufficient.

Do not leave an old ordinary-user-accessible capability-grant endpoint. Existing admin manual grants, if retained for maintenance, are admin-only, audited, and clearly separate from the applicant workflow. Public signup and profile editing must never accept isPlatformAdmin/canCreateEvents.

Proposed API mapping (reuse actual equivalent routes if present):
- POST /api/organizer-access-requests: create own application, 201.
- GET /api/organizer-access-requests/me: own history/current capability.
- POST /api/organizer-access-requests/[id]/withdraw: own pending only.
- GET /api/admin/organizer-access-requests: admin queue.
- POST /api/admin/organizer-access-requests/[id]/decision: APPROVE or REJECT with expectedVersion/reason.
- POST /api/admin/users/[id]/organizer-capability/revoke: admin-only revocation with reason.

Use 401 for unauthenticated API, 403 for unauthorized action, 409 for conflicting request state, 422 for validation. UI uses proper login return paths; JSON API must not redirect unauthorized callers to an HTML page.

## 6. Stage 5D — organizer provisions judges by email, per event

### Scope and roles

Add a Judges section inside the EXISTING event management workspace. Organizer enters an email and chooses permitted tracks. This is user-requested T2 groundwork brought into this extension. Access to scoring/assignments/rubrics/results remains future T2. A judge workspace must be useful now: show authorized events, schedules, selected tracks, access status, and an honest explanation that scoring is not yet available. Do not add a fake Score button.

Only an organizer for this event or platform admin can grant/revoke its judge access. Require at least one selected track; represent All current tracks as the explicit existing set. Tracks added later are not silently granted. Granting in event A grants no access in B. Public project galleries remain public for everyone, including judges; protected judge-workspace routes enforce track scope and never expose drafts or peer scores.

### Offline-capable flow, including unknown emails

1. Normalize email consistently with the existing auth system (trim/case handling); do not perform Gmail-specific dot/plus rewriting. Do not run a globally accessible account-search endpoint.
2. For an existing account, show a confirmation identifying that account and tracks to the authorized organizer. A confirmed Grant creates/activates the event judge role and JudgeTrack rows atomically. The organizer is explicitly authorizing this account; merely typing an unverified email is not automatic proof of mailbox ownership. Display account verification status honestly.
3. For an email without an account, create a pending invitation with random token and expiry. Provide Copy invitation link; do not say Email sent. Organizer shares it externally if desired; no SMTP dependency.
4. Invite page requires login/signup. Acceptance requires matching normalized account email and the invitation token. A mismatched account sees a switch-account instruction, not the full invited address or private event details.
5. Since offline signup does not verify email ownership, acceptance by a NEW/unverified account creates AWAITING_CONFIRMATION. Organizer sees the account and explicitly confirms it before any judge privileges activate. This closes the email-squatting gap without requiring internet. Verified matching accounts may activate directly on valid invitation acceptance, unless existing policy requires organizer confirmation for everyone.
6. Revoke/expire pending invitations; permit explicit renewal by rotating the token and invalidating the old link. Active access revocation immediately removes that event judge role and its track grants, invalidates authorization caches, and retains review history. Existing sessions cannot continue using revoked event access.

Token expiry proposed: 7 days, stored once, not extended each boot. Tokens stored hashed; raw link displayed only on creation/rotation. Do not expose tokens in list APIs, audit metadata or screenshots. Acceptance POST consumes token in a transaction; invitation GET has no granting side effect. Use no-store/referrer protections on token pages; no third-party resources.

### Incremental schema

Reuse EventRole and JudgeTrack for authorization. Add an administrative invitation/grant history record if no equivalent exists:

EventJudgeAccess:
- id String PK, eventId FK, emailNormalized text, userId nullable User FK.
- status INVITED/AWAITING_CONFIRMATION/ACTIVE/REVOKED/EXPIRED.
- invitedById User FK, confirmedById nullable User FK.
- tokenHash nullable UNIQUE, expiresAt?, acceptedAt?, confirmedAt?, revokedAt?.
- createdAt, updatedAt, version default 1.
- unique(eventId,emailNormalized); unique(id,eventId); index(eventId,status).

EventJudgeAccessTrack:
- accessId, eventId, trackId.
- PK(accessId,trackId).
- Composite FK(accessId,eventId) -> EventJudgeAccess; composite FK(trackId,eventId) -> Track.

The access record stores requested track scope; JudgeTrack stores active scope. Update both in one transaction on confirmation/scope edits; pending state never receives active rows. Role and track grant rows are the existing permission source; services reconcile invariants so status cannot say ACTIVE with absent role.

Backfill existing fixture judges into ACTIVE administrative records using EXISTING roles/track scopes; preserve IDs, reviews and permissions. Historical invitation/acceptance times are unknown: leave them null and mark migration provenance in audit. Do not manufacture invitation evidence. Do not make fixture judges reaccept invitations.

Update/reinvite reuses the unique event/email record and logs prior state in AuditLog. Remove or change active scope without deleting Review/CriterionScore. A changed profile email must not automatically retarget an active grant to a new person: access remains attached to userId; pending invitations use snapshot email.

### Conflict policy

For new grants, disallow a person judging an event where they are a participant/team member, or an organizer, with a clear conflict message. They may hold those roles in different events. Check the inverse: an active judge cannot join/create a participant team in that same event; pending invitations recheck conflicts when confirmed. Do not retroactively delete historical conflicting records; flag for review if discovered. Admin status alone does not require a judge role.

### UI and API

Judges tab: email input, searchable track multiselect, explicit Grant/Generate link action, table of email/account display name, track chips, state, invitation expiry and edit/revoke action. No public disclosure of judge emails. Pending invite badge differs from active judge badge. Success must reflect committed database state.

Suggested endpoints:
- GET/POST /api/events/[eventId]/judge-access: authorized list / grant or create invite.
- PATCH /api/events/[eventId]/judge-access/[accessId]: scope change, expectedVersion.
- POST .../[accessId]/confirm: organizer confirmation of pending accepted identity.
- POST .../[accessId]/revoke: revoke pending/active access.
- POST .../[accessId]/renew: rotate pending invitation.
- POST /api/judge-invitations/[token]/accept: accept as matching account.
- GET /api/me/judging-events: authorized events only; no scores.

Keep the official checker score URLs reserved for real T2 implementation. Do not make endpoints return empty 200s merely to change the acceptance report.

## 7. Stage 5E — black/red UI system and page redesign

### Direction: precise, bold, readable

Use charcoal surfaces, restrained crimson actions, warm white typography and strong alignment. The experience should feel like a professional event platform. Preserve the current product name/logo unless the owner requests a rebrand. Apply one theme across public and private pages. No decorative live statistics, terminal noise, oversized hero that hides events, constant background motion, or low-contrast red body paragraphs.

Tokens (map into the EXISTING shadcn/Tailwind token system; do not add conflicting duplicate variable blocks):

| Token | Value | Use |
|---|---|---|
| background | #09090B | Page background |
| foreground | #FAFAFA | Primary text |
| card | #141418 | Cards/workspaces |
| popover | #1C1C22 | Menus/dialogs |
| muted | #222229 | Muted surface |
| muted-foreground | #B4B4BF | Secondary text |
| border | #34343E | Decorative separators |
| input-border | #71717A | Form-control boundary; verify against actual surface |
| primary | #DC2626 | Main action background |
| primary-foreground | #FFFFFF | Main-action text |
| primary-hover | #B91C1C | Hover action |
| link/accent-text | #FCA5A5 | Links on dark background |
| ring | #FB7185 | Keyboard focus |
| success-text | #86EFAC | Positive state label |
| warning-text | #FDE68A | Pending/warning state label |
| destructive-text | #FDA4AF | Destructive/error label |

Check actual contrast after composition, opacity, disabled states and hover. Target at least 4.5:1 for normal text and 3:1 for large text/meaningful nontext controls. Statuses always have words/icons; color alone is insufficient. Reserve destructive action wording/icons and confirmation so red branding does not make Delete indistinguishable from Save.

Fonts: locally bundled Space Grotesk (headings) and Inter (body), with local license files; system-ui fallback. Use next/font/local if supported in the project; no runtime Google Fonts request and no network font fetch during an offline build. If assets cannot be obtained, use system fonts and document rather than leaving broken font imports. Body 16px/1.5; labels 14px; page heading 32–40px desktop/26–30px mobile; landing heading max 48–56px, not 100px. Numeric timestamps use tabular digits.

Spacing grid: 4/8/12/16/24/32/48px; card radius 12px, button/input radius 8px; inputs 44–48px high; buttons minimum 44px touch target. Desktop page padding 32px, mobile 16px. Use one subtle topographic/grid texture in public hero only if CSS-generated and readable. No image generation dependency is required for this redesign.

### Layouts

Public: compact brand/navigation/account header; home content described in Stage 5B; event detail uses event name/status, schedule strip, tabs Overview/Projects, content left and sticky action card right on desktop. Mobile action card becomes inline or a nonobstructive sticky action bar. No sticky UI covers validation messages or keyboard focus.

Authenticated workspace: 240px desktop sidebar with event switcher, 64px header, content max 1280px. Collapse sidebar to accessible drawer on mobile. Navigation items derive from permissions. Preserve current route structure and existing working widgets. Avoid nesting full public navigation and duplicate workspace navigation unnecessarily.

Organizer event workspace: Overview, Settings, Teams, Submissions, Judges. Existing settings stay in place; group long forms into clear sections with Save feedback. Show stored submission deadline near title. Admin request queue prioritizes decision tasks and detail reading. Participant workspace prioritizes current event/team, deadline, project state and Continue editing. Judge workspace lists real grants and selected tracks with T2 status; no invented review counts.

Submission editor: clear sections Basics/Details/Media/Custom questions/Review, either tabs or a short stepper preserving form state. Label Save draft and Submit distinctly. Retain expectedVersion concurrency and server error handling. Confirmation summarizes completeness before final submission. On mobile prefer one column; on desktop use a two-column grid for short inputs but full width for description. Unsaved-change warning only when genuinely dirty.

Gallery cards: consistent 3:2 thumbnail area, title, tagline, track/tags, team display name. Missing fixture thumbnails get an attractive deterministic CSS monogram derived from project ID/title, not invented project screenshots. Filters in URL for refresh/back behavior. Keep official fixture-gallery ordering/SSR response intact.

### Interaction and accessibility

Motion: 120–180ms hover/focus transitions; 180–240ms drawer/modal transitions; no animation before data becomes visible. Respect prefers-reduced-motion. Loading skeletons reflect layout and announce loading appropriately. Distinguish no records, filtered no-results, failed request and forbidden access. Toast plus inline feedback for saves; inline field errors tied to labels. Dialogs trap focus and restore it; Escape closes nondestructive dialogs. Prevent double submit and show in-flight state. Test keyboard navigation and 200% zoom.

Responsive acceptance viewports: 1440x900, 1024x768, 768x1024, 390x844, 360x800. No whole-page horizontal overflow. Tables may scroll within a clearly labeled region or use stacked rows. Review real screenshots for every role; code inspection alone is not visual QA.

## 8. Stage 5F — regression proof and docs before Stage 6

### Tests to add/retain

1. Root page has public event content as visitor and all authenticated role combinations. Draft/private events remain hidden.
2. Fixture remains closed; separate demo event retains its intended dates; known deadline is visible even with missing event start/end.
3. Timezone roundtrip: organizer input saved instant and public display agree; exact deadline boundary remains server-enforced.
4. Applicant cannot self-approve, edit decision fields or view another user's application. One pending request under concurrent submissions.
5. Admin approval/rejection and concurrent decisions are safe. Approved user can create event but cannot manage unrelated events. Revoked creation capability blocks direct API requests without deleting managed events.
6. Organizer for A cannot grant judges in B. Selected tracks must belong to the same event. Existing fixture judge scopes survive migration.
7. Unknown-email invite -> signup -> acceptance awaiting confirmation -> organizer confirms -> event appears in judge workspace. Wrong email/token, expired/revoked/replayed invite rejected. No email-sent claim offline.
8. Direct known-account grant and immediate revocation; existing session loses protected event access. Role/scope changes invalidate relevant caches.
9. Participant/judge conflict checked in both grant and team-join directions.
10. Judge cannot see private submissions, organizer APIs, peer scores or protected other-track data. Public gallery stays public.
11. Existing draft/save/submit/deadline/upload/privacy/concurrency tests still pass. Retain 41 fixture projects and review data without duplicates/loss.
12. Actual browser screenshots, keyboard/contrast/zoom checks across responsive viewports; local fonts and images work offline.
13. Official three T1 assertions still pass; do not modify official report to hide incomplete T2.

Do not build exhaustive tests for every static color; test the meaningful permission/data changes and inspect visuals. Use disposable test data/database. Never reset the user's working DB.

### Documentation updates

- docs/CURRENT_UI_AND_T1_AUDIT.md: evidence and actual paths before changes.
- docs/T1_EXTENSION_AFTER_STAGE_5.md: this plan.
- docs/DECISIONS.md: schema/route mappings, timezone policy, organizer capability versus event role, offline judge identity confirmation, updated competition dates.
- docs/UI_SYSTEM.md: tokens/fonts/components/responsive rules; font licenses.
- docs/T1_CHECKLIST.md: full product requirement evidence, not only checker status.
- README.md: organizer request/admin approval journey, judge provisioning, demo accounts, unfinished T2 scoring, revised screenshots; preserve offline instructions.
- ARCHITECTURE.md and DATA-MODEL.md: new state transitions, additive migrations, uniqueness and transactional rules.
- JUDGING.md: access provisioning is implemented; assignments/rubric/scoring/normalization remain explicitly incomplete until T2.

The mandatory submission documents and demo remain required. These supplementary documents do not replace them. Stage 6 still handles reproducible production Compose startup, final acceptance output, offline image preparation and final packaging.

## 9. Antigravity implementation prompts

Send each block after its preceding checkpoint. Do not rerun original Stages 0–5. Each prompt relies on the two documents in the repo and the audit; it does not rely on access to this chat.

### Stage 5B prompt

```text
Implement Stage 5B from docs/T1_EXTENSION_AFTER_STAGE_5.md using docs/CURRENT_UI_AND_T1_AUDIT.md. Fix the proven cause of the empty root page and absent dates/data. Preserve existing organizer event configuration. Public home lists real published events including closed fixtures and provides permission-aware workspace actions. Do not reset/reseed automatically, invent event dates, or hardcode records. Implement shared deterministic timezone/date/status rendering and add only missing schema fields via additive migration. Keep private events hidden and protect mutations. Verify visitor/participant/organizer/judge/admin views and timezone/deadline behavior. Report exact files, commands, screenshots/tests and unverified items. Stop after the checkpoint.
```

### Stage 5C prompt

```text
Implement Stage 5C organizer-access applications as specified in docs/T1_EXTENSION_AFTER_STAGE_5.md. Reuse existing capability/event-role logic and working event forms. Add applicant state/history UI and admin decision queue; transactional approval sets canCreateEvents and audit history, rejection provides reason, revocation blocks new event creation but does not silently delete management rights. Enforce one pending application, ownership, state/version guards and no public privilege writes. Migrate additively and retain current approved organizers. Verify API denial, approval/rejection, concurrent decisions and unrelated-event isolation. Update docs and report evidence. Stop at Stage 5C checkpoint.
```

### Stage 5D prompt

```text
Implement Stage 5D event-scoped judge provisioning from the extension. Add email and track inputs to the existing event organizer workspace. For an existing account require organizer confirmation before direct grant. For an unknown email create a hashed-token offline copy-link invitation; matching new/unverified account acceptance awaits organizer confirmation before access. Never claim email was sent. Reuse existing EventRole/JudgeTrack authorization, add administrative records only where absent, backfill fixture judges without fabricated history, and retain reviews on revocation. Enforce cross-event/track boundaries, expiry, replay protection, immediate revocation and bidirectional participant conflicts. Provide a real judge events/schedule workspace; defer actual scoring to T2 and do not fabricate passing score endpoints. Test all branches, update docs, and stop.
```

### Stage 5E prompt

```text
Implement Stage 5E black/red visual redesign from the extension using the actual UI audit and now-working workflows. Preserve routes, data queries, event configuration, permission checks and form behavior. Map the specified tokens into the current shadcn/Tailwind theme; use locally bundled Space Grotesk/Inter or documented system fallbacks. Apply the public/workspace layouts across home, event detail, organizer, requests/admin, participant editor, gallery and judge screens. Do not introduce fake stats or network assets. Implement responsive loading/empty/error states, accessible dialogs/forms, focus and reduced motion. Check computed contrast and capture screenshots at prescribed desktop/mobile sizes. Do not describe the redesign as visually verified unless screenshots/browser inspection were actually done. Fix regressions and report results.
```

### Stage 5F prompt

```text
Complete Stage 5F regression checks and documentation from the extension. Test the real approval and judge-grant workflows, exact deadline behavior, protected data, migration preservation and cross-role home rendering. Run existing T1 tests and unchanged official checker where configured; preserve raw results and unfinished T2 status. Inspect screenshots/keyboard/mobile layouts and fix concrete defects. Update README, ARCHITECTURE, DATA-MODEL, JUDGING, DECISIONS, UI_SYSTEM and T1_CHECKLIST with actual behavior. Never reset working data or claim tests not run. Finish with what is ready for original Stage 6 and any remaining blockers.
```

## 10. Owner's execution order

1. Save this extension as docs/T1_EXTENSION_AFTER_STAGE_5.md next to the original plan.
2. Give Antigravity the Stage 5A audit prompt first. The audit is the source of truth about current UI/code.
3. Optionally share the audit and screenshots back for visual refinement; implementation can continue against this plan without rebuilding the app.
4. Run 5B (content/dates), 5C (organizer requests), 5D (judge grants), 5E (visual system), 5F (regressions/docs).
5. Then give the original Stage 6 prompt with an additional instruction to preserve the extension and include its migrations/assets in the offline image.
6. Continue to genuine T2 judging implementation separately. Judge access groundwork alone does not complete T2.

No application code has been changed by this document. This is a concrete extension plan; actual completion requires the local implementation and evidence above.
