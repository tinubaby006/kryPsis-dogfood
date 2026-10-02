# kryPsis Dogfood — Master Implementation Specification

## Objective

Implement one complete pass that fixes the current `evt_01` dogfood acceptance failures and all identified organizer, judge, admin, event-creation, results, export, and navigation issues.

The implementation must not be treated as a collection of unrelated UI patches.

The final system must have:

* working judge score visibility
* immutable submitted reviews
* correct judge authorization
* working organizer CSV export
* working Explainability & Results
* working judge invitations with and without tracks
* correct `evt_01` visibility
* human-readable CSV exports
* compact organizer judge list
* working dashboard sign-out
* visible pending proposals in admin
* "Propose an Event" available from the home page
* consistent modern judging data
* correct event/stage authorization
* acceptance tests passing

---

# 1. CURRENT ACCEPTANCE FAILURE — MUST FIX FIRST

Current command:

```powershell
D:\kryPsis-dogfood>python D:\kryPsis-dogfood\docs\official\run.py .dogfood.toml
```

Current result:

```text
DOGFOOD 2026 acceptance report
portal: http://127.0.0.1:3000
claimed: T1 T2
fixtures: D:\kryPsis-dogfood\docs\official\fixtures.json

T1  gallery is public ................. PASS
T1  project from fixtures shown ....... PASS
T1  closed event refuses submissions .. PASS
T2  judge sees own scores ............. FAIL
       GET http://127.0.0.1:3000/api/judge/scores?eventId=evt_01
       sent as judge_a
       got 401, wanted 200

T2  judge cannot see peer scores ...... PASS
T2  participant blocked ............... PASS

T2  csv export works .................. FAIL
       GET http://127.0.0.1:3000/organizer/events/evt_01/exports?type=historical_reviews
       sent as organizer
       got 401, wanted 200

claimed T1 T2, verified T1
note: claimed but not verified: T2
```

## Acceptance blockers

### Blocker A — Judge scores endpoint returns 401

Endpoint:

```text
GET /api/judge/scores?eventId=evt_01
```

Authenticated as:

```text
judge_a
```

Expected:

```text
200
```

Actual:

```text
401
```

Required behavior:

1. An authenticated judge assigned to the event can access the endpoint.
2. The endpoint returns that judge's own submitted scores.
3. The endpoint must not return another judge's scores.
4. A participant/non-judge must remain blocked.
5. Submitted scores must be read-only.
6. The response must work for both the acceptance fixture and normal stage-based judging data.

Do **not** weaken authorization simply to make the test pass.

The authorization should verify:

```text
authenticated user
    ↓
judge assignment/access for event
    ↓
requested scores belong to that judge
```

It must never become:

```text
authenticated user → all event scores
```

The existing acceptance result already proves that peer-score isolation is expected because:

```text
T2 judge cannot see peer scores ........ PASS
T2 participant blocked ................. PASS
```

Therefore fix the `401` specifically without breaking those protections.

---

# 2. BLOCKER B — Organizer CSV export returns 401

Endpoint:

```text
GET /organizer/events/evt_01/exports?type=historical_reviews
```

Authenticated as:

```text
organizer
```

Expected:

```text
200
```

Actual:

```text
401
```

Required behavior:

1. An authenticated organizer for `evt_01` can export event data.
2. A platform admin with appropriate access can export it if the existing application authorization model allows that.
3. An unrelated user cannot export it.
4. The export must continue respecting event authorization.
5. The export must contain readable project/judge information, not only database IDs.

The organizer authorization must be consistent with the organizer dashboard authorization.

The existing data investigation found that `evt_01` originally had no `EventRole` with `role = 'ORGANIZER'`, which prevented organizer access. A temporary organizer was subsequently created during the data-layer investigation.

Do not solve this by making `/exports` publicly accessible.

---

# 3. JUDGE SCORE VISIBILITY AND IMMUTABILITY

## Problem

Judges can see that they reviewed projects but cannot reliably see their submitted scores.

They also must not be able to edit a review after submission.

There are two layers to this problem:

### Layer 1 — authorization/API

The acceptance endpoint currently returns `401`.

Fix:

```text
/api/judge/scores
```

so an authorized judge receives their own scores.

### Layer 2 — UI/data synchronization

The judge dashboard currently shows a submitted assignment but does not display the actual score total.

Additionally, `ReviewForm.tsx` initializes its React `scores` state once. After submission, the new `finalReview` arrives but the local state remains stale/empty.

This is documented in the existing implementation plan.

## Required implementation

### Judge dashboard

Update:

```text
app/events/[eventId]/judge/page.tsx
```

For every submitted assignment show something like:

```text
Submitted
Score: 45/50
```

Use the actual rubric/score data.

Do not expose peer scores.

### ReviewForm

Update:

```text
ReviewForm.tsx
```

Synchronize local state when `finalReview` becomes available.

Conceptually:

```tsx
useEffect(() => {
    if (finalReview) {
        setScores(...)
    }
}, [finalReview])
```

After a review has been submitted:

* display the submitted values
* disable score inputs
* disable comment editing
* disable submission controls
* do not allow a second modification
* do not merely hide the button while leaving inputs editable

The immutable state should be based on the persisted submission status, not only on a temporary React state.

---

# 4. IMPORTANT: USE THE MODERN STAGE SCORING SYSTEM

The existing investigation found that `evt_01` contains two scoring systems.

## Legacy

```text
Review
Criterion
CriterionScore
```

## Modern

```text
JudgingStage
RubricVersion
RubricCriterion
AssignmentRun
RubricAssignment
StageReview
StageCriterionScore
CalculationRun
ProjectResult
```

The seed populated the legacy system while the dashboards read the modern system. Therefore scores existed in the database but were invisible to dashboards.

The prior data migration created:

```text
1 AssignmentRun
41 StageProject
30 StageJudge
126 RubricAssignment
126 StageReview
378 StageCriterionScore
1 CalculationRun
41 ProjectResult
```

with deterministic mappings such as:

```text
Review.id
    ↓
ra_<review.id>
    ↓
sr_<review.id>
```

The migration details are documented in the existing report.

## Implementation requirement

Do not create a third scoring path.

All new judge/dashboard functionality should use the modern stage system.

If legacy compatibility is required for:

```text
historical_reviews
```

keep it as an explicit legacy export path, but do not make the judge dashboard depend on legacy tables.

---

# 5. SUBMITTED REVIEWS MUST BE READ-ONLY

Once:

```text
RubricAssignment.status = SUBMITTED
```

and/or a corresponding:

```text
StageReview
```

exists:

the judge may:

* view their project
* view their submitted score
* view their comment
* view submission status

but may not:

* change criterion scores
* change the comment
* resubmit
* overwrite the StageReview
* modify another judge's review

The server must enforce this.

The UI alone is insufficient.

---

# 6. EXPLAINABILITY & RESULTS IS INVISIBLE

## Problem

The organizer cannot see:

```text
Explainability & Results
```

and directly visiting the URL does not produce the expected results UI.

The existing report identifies the immediate cause:

```tsx
["CLOSED", "CALCULATING", "FINALIZED", "PUBLISHED"]
```

does not contain:

```text
CALCULATED
```

while `evt_01` is currently in:

```text
CALCULATED
```

state.

## Fix

Update:

```text
app/organizer/events/[eventId]/JudgingStagesSection.tsx
```

from:

```tsx
["CLOSED", "CALCULATING", "FINALIZED", "PUBLISHED"]
```

to:

```tsx
[
    "CLOSED",
    "CALCULATING",
    "CALCULATED",
    "FINALIZED",
    "PUBLISHED",
]
```

Also update the corresponding state validation in:

```text
app/organizer/events/[eventId]/judging-actions.ts
```

The current implementation plan specifically identifies both locations.

## Direct URL behavior

The route:

```text
/organizer/events/{eventId}/results/{stageId}
```

must render the results page when the stage is:

```text
CALCULATED
```

It must not merely rely on the dashboard link being visible.

---

# 7. CALCULATION MUST USE THE REAL ALGORITHM

The existing SQL migration created a mock calculation using:

```sql
AVG(StageCriterionScore.value)
```

That is not equivalent to the application's real Weighted WLS calculation.

The real calculation performs:

* judge calibration
* connectivity checks
* weighted least squares normalization
* calculation preview
* calculation commit

The existing report explicitly identifies this discrepancy.

## Required implementation

Do not ship the mock `AVG()` calculation as the final behavior.

Use:

```text
lib/judging/calculation.ts
```

and the application's:

```text
generateCalculationPreview()
commitCalculationRun()
```

flow.

For `evt_01`:

1. Move stage to `CLOSED` if necessary.
2. Calculate using the actual implementation.
3. Commit the calculation.
4. Verify `CalculationRun`.
5. Verify `ProjectResult`.
6. Verify Explainability & Results.
7. Verify finalization works.

The existing report also identifies a related `FinalizationSnapshot`/hash issue caused by the mock calculation.

---

# 8. EVENT CREATION — JUDGE INVITATION/TRACK BUG

## Problem

When creating an event:

* without tracks, the event defaults to `SINGLE_POOL`
* the judge invitation UI can still force track selection
* the API then rejects the request with an error similar to:

```text
single pool events cannot have track selections
```

The root cause and proposed fix are already identified in the implementation report.

## Required behavior

### SINGLE_POOL

If:

```text
tracksMode = SINGLE_POOL
```

then:

* do not show track selection checkboxes
* submit:

```ts
trackIds: []
```

* allow judge invitation

### TRACKED event

If tracks are configured:

* show track selection
* allow selecting relevant tracks
* submit those IDs
* validate that selected tracks belong to the event

### Important

Do not make tracks mandatory merely to invite judges.

The following combinations must work:

```text
SINGLE_POOL + judge invitation
```

and:

```text
TRACKED + judge invitation + selected tracks
```

---

# 9. EVENT `evt_01` VISIBILITY

Current issue:

```text
evt_01 was a draft, not public
```

The requested dogfood behavior is:

```text
PUBLIC
```

Update the fixture/event data accordingly.

For the current dogfood fixture:

```sql
UPDATE "Event"
SET visibility = 'PUBLIC'
WHERE id = 'evt_01';
```

But also fix the seed so the next database reset does not recreate the bug.

Do not rely on a one-time manual SQL mutation.

---

# 10. SEED `evt_01` CORRECTLY

The existing seed problem is the underlying reason this entire class of dashboard bugs appeared.

The seed creates legacy scores for `evt_01`, while modern stage records are created for the demo event.

The master implementation must update:

```text
scripts/seed.ts
```

so a fresh database produces a complete `evt_01`.

It should create:

1. event
2. organizer
3. organizer `EventRole`
4. judge users
5. judge `EventRole`
6. `EventJudgeAccess`
7. `EventJudgeAccessTrack` where appropriate
8. judging stage
9. rubric version
10. rubric criteria
11. assignment run
12. stage projects
13. stage judges
14. rubric assignments
15. stage reviews
16. stage criterion scores
17. calculation data where appropriate
18. public visibility

The previous report explicitly identifies updating `seed.ts` as the long-term fix.

---

# 11. ORGANIZER CSV EXPORT

## Current problem

CSV exports contain database IDs such as CUIDs.

That makes the export technically correct but difficult for organizers to understand.

The existing plan identifies that the export route currently selects IDs without enough relation data.

## Required export design

Do not remove IDs.

Keep relevant IDs for traceability.

But add human-readable fields.

Example:

```text
Project ID
Project Name
Judge ID
Judge Name
Judge Email
Event ID
Stage ID
Criterion ID
Criterion Name
Score
Comment
Submitted At
```

The exact fields should follow the actual export's data model.

### Principle

Bad:

```text
projectId,judgeUserId,criterionId,value
cmxxx,cmxxx,cmxxx,9
```

Better:

```text
Project ID,Project Name,Judge ID,Judge Name,Judge Email,Criterion ID,Criterion Name,Score
proj_123,AI Waste Tracker,judge_123,Alice Thomas,alice@example.com,crit_01,Innovation,9
```

IDs remain available for technical reconciliation.

Names make the export useful to an organizer.

---

# 12. ORGANIZER CSV AUTHORIZATION

The export endpoint:

```text
/organizer/events/[eventId]/exports
```

must correctly authorize the organizer.

Current acceptance:

```text
organizer → 401
```

Expected:

```text
organizer → 200
```

Authorization should be event-scoped.

Conceptually:

```text
session user
    ↓
EventRole for event
    ↓
ORGANIZER
    ↓
export allowed
```

Also support the application's established platform-admin behavior where appropriate.

Do not make exports public.

---

# 13. ORGANIZER JUDGE LIST — KEEP DASHBOARD COMPACT

## Problem

The judge section is so long that the judging stage section is pushed far down the page.

The requested behavior is:

> keep two judges there, rest another URL endpoint

The earlier implementation plan suggested five plus a "Show All" control, but the latest explicit requirement is **two judges visible on the dashboard**.

Therefore use:

```text
2 judges
```

as the default dashboard display.

Example:

```text
Judges

Alice Thomas
Active

Rahul Menon
Active

View all 30 judges →
```

The complete judge list should be available on a dedicated route/page.

For example:

```text
/organizer/events/{eventId}/judges
```

or the existing project convention if another route already exists.

Do not make the organizer dashboard grow vertically with dozens of judges.

The prior implementation plan identified the underlying problem and proposed capping the visible list.

---

# 14. ORGANIZER DASHBOARD SIGN OUT

## Problem

The sign-out button next to the proposed event action does not work.

The dashboard currently uses:

```html
<form action="/api/auth/sign-out" method="POST">
```

while the application uses Better Auth's client-side API.

The existing implementation plan identifies this mismatch.

## Fix

Create/use:

```text
SignOutButton
```

as a client component.

Use:

```ts
authClient.signOut()
```

matching the application's working Navbar implementation.

After sign out:

* session is destroyed
* user is redirected appropriately
* protected dashboard cannot remain accessible through client state

---

# 15. ADMIN — PENDING PROPOSALS MUST BE VISIBLE

## Problem

Admin has two different concepts:

```text
/admin/organizer-requests
```

and:

```text
/admin/proposals
```

The dashboard currently does not make both sufficiently visible.

The existing report documents this split.

## Required admin dashboard

Show clear navigation/actions for both:

```text
Organizer Access Requests
```

and:

```text
Event Proposals
```

For example:

```text
Admin

Organizer Access Requests
[Review Requests]

Event Proposals
[Review Proposals]
```

Pending event proposals must not disappear simply because they are not organizer-access requests.

Do not merge the underlying data models unless the application architecture requires it.

Make the distinction clear.

---

# 16. "PROPOSE AN EVENT" ON HOME PAGE

## Problem

Currently the home page only exposes the event creation/proposal action when:

```text
session.user.canCreateEvents
```

is true.

Normal logged-in users therefore cannot see the proposal option.

The existing implementation plan identifies this exact conditional.

## Required behavior

The home page must show:

```text
Propose an Event
```

to logged-in users.

It should link to:

```text
/organizer/events/new
```

The backend must still enforce whether the user is allowed to directly create/publish an event.

Important distinction:

```text
button visibility ≠ permission bypass
```

A normal user should be able to propose an event without being granted organizer powers.

---

# 17. ORGANIZER PAGE AUTHORIZATION CONSISTENCY

The existing investigation found that:

```text
app/organizer/events/[eventId]/page.tsx
```

checks only:

```text
EventRole = ORGANIZER
```

while APIs/server actions may also allow:

```text
isPlatformAdmin
```

This creates inconsistent authorization.

The existing report recommends making the page authorization consistent with the API/server-action behavior.

## Required behavior

Organizer page access:

```text
event organizer
OR
authorized platform admin
```

The same conceptual authorization should be used throughout:

* dashboard
* judge access
* results
* exports
* stage actions

Do not have:

```text
API → admin allowed
page → admin denied
```

---

# 18. JUDGE ACCESS DATA

The organizer JudgesSection reads:

```text
EventJudgeAccess
```

not merely:

```text
EventRole
```

The existing seed only created judge EventRoles, which is why judges were absent from the organizer dashboard.

The permanent implementation must therefore seed/create:

```text
EventJudgeAccess
```

and:

```text
EventJudgeAccessTrack
```

correctly.

For `evt_01`, the existing data-layer repair produced:

```text
30 EventJudgeAccess rows
39 EventJudgeAccessTrack rows
```

as a temporary backfill.

The fresh seed should reproduce the required relationships naturally.

---

# 19. DO NOT LEAVE THE FIX AS MANUAL DATABASE PATCHES

The previous work successfully fixed much of `evt_01` through SQL, but the report explicitly states:

> No application source code was modified. All fixes were data-layer patches via SQL scripts.

That is useful for diagnosing the fixture, but it is not sufficient as the permanent implementation.

The master implementation must move the permanent behavior into:

```text
application code
+
seed/fixture logic
+
database state where appropriate
```

Manual SQL may be used once to repair the local dogfood database, but the repository must be correct after a clean seed.

---

# 20. DOCKER DEVELOPMENT SUPPORT

The existing investigation found that the production Docker image does not mount application source code, making ad-hoc calculation scripts difficult to run.

The report proposes:

```yaml
volumes:
  - ./scripts:/app/scripts
  - ./lib:/app/lib
```

where required.

For this implementation:

* prefer application code/server actions over ad-hoc scripts
* if calculation scripts are needed during development, ensure the dev container has access to required source
* do not make production depend on source mounts

---

# 21. IMPLEMENTATION ORDER

Implement in this order to avoid fixing UI symptoms before the underlying authorization/data path works.

## Phase 1 — Acceptance blockers

### 1. Judge score API

Fix:

```text
GET /api/judge/scores?eventId=evt_01
```

Expected:

```text
judge_a → 200
judge_a → own scores only
participant → blocked
judge_a → peer scores blocked
```

### 2. Organizer export API

Fix:

```text
GET /organizer/events/evt_01/exports?type=historical_reviews
```

Expected:

```text
organizer → 200
unauthorized user → blocked
```

### 3. Re-run `run.py`

Do not proceed to UI polishing until the two acceptance failures are resolved without breaking the three already-passing T2 checks.

---

# Phase 2 — Data architecture

Fix `seed.ts` so `evt_01` is created consistently using the modern judging system.

Verify:

```text
Organizer
EventRole
EventJudgeAccess
EventJudgeAccessTrack
JudgingStage
RubricVersion
RubricCriterion
StageProject
StageJudge
RubricAssignment
StageReview
StageCriterionScore
```

are populated appropriately.

---

# Phase 3 — Judge experience

Fix:

```text
app/events/[eventId]/judge/page.tsx
ReviewForm.tsx
/api/judge/scores
```

Implement:

* own score visibility
* score totals
* criterion score visibility
* submitted state
* read-only submitted reviews
* correct synchronization after submission
* no peer-score exposure

---

# Phase 4 — Organizer judging/results

Fix:

```text
JudgingStagesSection.tsx
judging-actions.ts
results/[stageId]/page.tsx
```

Support:

```text
CALCULATED
```

and ensure Explainability & Results actually renders.

Then ensure real WLS calculation is used rather than the temporary AVG mock.

---

# Phase 5 — Event creation

Fix:

```text
JudgesSection.tsx
```

so:

```text
SINGLE_POOL → no track selection
TRACKED → track selection
```

and both event types support judge invitations.

---

# Phase 6 — Organizer UX

Fix:

* two-judge preview
* dedicated all-judges route
* working sign out
* readable CSV
* IDs + names
* organizer dashboard navigation

---

# Phase 7 — Admin UX

Fix:

* organizer access requests navigation
* event proposal navigation
* pending proposals visibility

---

# Phase 8 — Home page

Add:

```text
Propose an Event
```

to the home page for logged-in users.

Keep server-side authorization intact.

---

# 22. ACCEPTANCE TEST MATRIX

After implementation, run:

```powershell
python D:\kryPsis-dogfood\docs\official\run.py .dogfood.toml
```

Required result:

```text
T1  gallery is public ................. PASS
T1  project from fixtures shown ....... PASS
T1  closed event refuses submissions .. PASS

T2  judge sees own scores ............. PASS
T2  judge cannot see peer scores ...... PASS
T2  participant blocked ............... PASS
T2  csv export works .................. PASS
```

Final status must be:

```text
claimed T1 T2, verified T1 T2
```

and must no longer say:

```text
claimed but not verified: T2
```

---

# 23. MANUAL UI ACCEPTANCE CHECKLIST

## Judge

* [ ] Judge can open assigned project.
* [ ] Judge can enter scores before submission.
* [ ] Judge can submit review.
* [ ] Submitted review displays score.
* [ ] Submitted review displays comment.
* [ ] Submitted inputs are disabled.
* [ ] Judge cannot modify submitted review.
* [ ] Judge sees own scores through `/api/judge/scores`.
* [ ] Judge cannot see peer scores.
* [ ] Participant cannot access judge scores.

## Organizer

* [ ] Organizer can open `evt_01`.
* [ ] Judges are visible.
* [ ] Only two judges appear in dashboard preview.
* [ ] "View all judges" opens full list.
* [ ] Judging stages remain visible without excessive scrolling.
* [ ] Explainability & Results appears for `CALCULATED`.
* [ ] Results URL works directly.
* [ ] Calculation data is visible.
* [ ] Organizer can export CSV.
* [ ] CSV contains IDs and readable names.
* [ ] Sign Out works.

## Event creation

* [ ] Propose Event exists on home page.
* [ ] User can begin proposal.
* [ ] SINGLE_POOL event can invite judges without selecting tracks.
* [ ] TRACKED event can invite judges with tracks.
* [ ] Invalid track assignments are rejected correctly.

## Admin

* [ ] Pending event proposals are visible.
* [ ] Organizer access requests are visible.
* [ ] Both have clear navigation.

## Event

* [ ] `evt_01` is public.
* [ ] Gallery remains public.
* [ ] Closed event still refuses submissions.

---

# 24. IMPORTANT NON-REGRESSION RULES

Do not fix one acceptance test by breaking another.

In particular:

### Do not

* make judge scores public
* remove peer-score isolation
* remove participant authorization
* make exports public
* allow submitted reviews to be edited
* bypass event authorization
* hard-code `evt_01` behavior into normal application routes
* rely permanently on manual SQL
* use mock averages as the production calculation
* require tracks for SINGLE_POOL events
* remove IDs from CSVs

### Do

* fix authorization at the correct layer
* use event-scoped roles/access
* use modern stage scoring
* preserve IDs while adding readable names
* enforce immutability server-side
* make seed data reproduce the correct state
* support platform-admin authorization consistently
* keep the organizer dashboard compact

---

# 25. FILES EXPECTED TO CHANGE

Primary files:

```text
scripts/seed.ts

app/api/judge/scores/route.ts
app/events/[eventId]/judge/page.tsx
ReviewForm.tsx

app/organizer/events/[eventId]/JudgesSection.tsx
app/organizer/events/[eventId]/JudgingStagesSection.tsx
app/organizer/events/[eventId]/judging-actions.ts
app/organizer/events/[eventId]/exports/route.ts
app/organizer/events/[eventId]/results/[stageId]/page.tsx

app/dashboard/page.tsx
app/admin/page.tsx
HomeClient.tsx
```

Exact paths should follow the existing repository structure if a component is located elsewhere.

Potential supporting files:

```text
lib/auth.ts
lib/judging/calculation.ts
docker-compose.yml
docker-compose.dev.yml
```

Only modify these where actually required.

---

# 26. FINAL DEFINITION OF DONE

This work is complete only when all of the following are true:

1. `run.py` T1 remains fully passing.
2. `run.py` T2 is fully passing.
3. Judge score endpoint returns `200` to an authorized judge.
4. Judge sees only their own scores.
5. Peer-score protection remains intact.
6. Participant protection remains intact.
7. Organizer export returns `200`.
8. Export contains readable names plus useful IDs.
9. Submitted reviews are immutable.
10. Judge UI correctly displays submitted scores.
11. Explainability & Results appears for `CALCULATED`.
12. Results URL renders correctly.
13. Real calculation logic is used.
14. Judge invitations work for SINGLE_POOL.
15. Judge invitations work for tracked events.
16. `evt_01` is public.
17. Organizer dashboard judge list is compact.
18. Full judge list is available separately.
19. Dashboard sign out works.
20. Admin can see both proposal and organizer-request workflows.
21. Home page has "Propose an Event".
22. Fresh seed reproduces the correct state without manual SQL patches.
23. Organizer/platform-admin authorization is consistent.
24. No existing T1/T2 security behavior regresses.

Final acceptance:

```text
DOGFOOD 2026 acceptance report

T1 ... PASS
T1 ... PASS
T1 ... PASS

T2 judge sees own scores ............. PASS
T2 judge cannot see peer scores ...... PASS
T2 participant blocked ............... PASS
T2 csv export works .................. PASS

claimed T1 T2, verified T1 T2
```
