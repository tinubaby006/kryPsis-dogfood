# DOGFOOD T2 — reviewed implementation guide and Antigravity prompts

Prepared 29 September 2026. Continue the existing T1 application; do not start a new project.

## 1. Read this first

**Recommendation:** deliver a complete rubric-based T2 first, then implement the team's pairwise and multi-stage extensions. Keep Next.js + TypeScript + local PostgreSQL + Prisma + Better Auth + Tailwind/shadcn. A separate backend, Redis, Python service, cloud database, hosted authentication, or AI scoring service is unnecessary for this scope. Put judging mathematics in pure server-side TypeScript modules and keep HTTP handlers thin.

I reviewed both supplied documents: `JUDGING.md` (2,275 lines) and `T2_IMPLEMENTATION_PLAN.md` (4,690 lines), including their mathematics, lifecycle, acceptance matrices, operational requirements, and final implementation sequence. I also rechecked the official website and spec page and downloaded `spec.md`, `run.py`, and `fixtures.json` again.

This is a design review and implementation prescription. I have not inspected your current repository, executed your application, or verified that the T1 extensions were completed. Your earlier confirmed milestone was T1 through Stage 5; use the repository audit below to establish the actual present state.

### Dates and source versions

- The current official timeline gives kickoff as **26 September 2026, 18:00 UTC** and code freeze/submission as **29 September 2026, 18:00 UTC**. The latter is **29 September, 23:30 India Standard Time**. Do not confuse this with the later write-up deadline.
- Your team implementation document is dated 28 September 2026.
- The downloaded spec now says Saturday–Tuesday in its example narrative. It still contains a Sunday submission example; that story is not the authoritative event deadline. Use the dated main timeline.
- Your reported permission to prebuild T1 does not by itself establish an extension of the submission deadline. Retain the organizer's message with your own records.
- The fixture's `2026-03-01T18:00:00Z` submission deadline belongs to the sample event. Preserve it. It is deliberately past and must not become the real hackathon deadline or be changed to make demos easier.

Current downloaded SHA-256 values:

| File | SHA-256 |
|---|---|
| fixtures.json | `252896bc45d49fca69ad413be40c6bfde9d9b9f9dd8db702b3ff74eaaa181121` |
| run.py | `aa98963841bc8e18e8e5d76f0499697c093dd3c0055f9d73a459f592f4dcf09d` |
| spec.md | `07e479728e7e6961fcf5053e159e6dc807bae3e4b371ee088e4a17897950d290` |

The downloaded runner and fixture match the earlier copies available for this review. The spec's narrative weekday wording changed. Archive the files you actually submit against and record hashes; do not modify the checker.

Sources: [main brief](https://dogfoodhack.com/), [spec page](https://dogfoodhack.com/spec/), [spec.md](https://dogfoodhack.com/spec/spec.md), [run.py](https://dogfoodhack.com/spec/run.py), [fixtures.json](https://dogfoodhack.com/spec/fixtures.json).

## 2. What is required, and what is your team's additional ambition?

| Delivery level | Scope |
|---|---|
| Official T2 | Judge invitations and assignment; configurable weighted rubric; backend judge/track isolation; organizer progress; documented cross-judge normalization; CSV exports throughout judging. Preserve working T1 and offline operation. |
| Strong implementation of T2 | Frozen rubric versions, deterministic assignments, review drafts/final submission, WLS diagnostics, audit trail, honest handling of incomplete evidence, reproducible results, publication controls, security tests. These are recommended mechanisms for delivering the requirements well. |
| Optional pairwise bonus | Human pair comparisons and a Bradley–Terry style ranking. Rubric scoring remains necessary for the T2 baseline. |
| Team extensions | Adaptive pair scheduling, arbitrary mixed-method pipelines, automatic overall-calibration decisions, fresh overall panels, proportional quotas, and comprehensive immutable snapshots. Valuable, but not all are conditions of official T2. |

**Important naming distinction:** your team's “Type 1 / Type 2” means no-track / multi-track competitions. The hackathon's “T1 / T2” means submission / judging tiers. In code and UI use `SINGLE_POOL` and `MULTI_TRACK` for competition structure to prevent confusion.

Your team's definition of done is a definition for its entire proposed judging engine. It is broader than the official T2 definition. Keep two checklists: official tier completion, and advanced-engine completion. Do not claim advanced features merely because their schema or buttons exist.

If implementing on submission day, complete core stages C0–C8 below before optional stages A1–A4. Do not leave isolation, progress, exports, Docker, and documentation until after the adaptive engine. There is no credible guarantee that all 63 phases in the team's plan can be built and verified in the remaining event window.

## 3. Review verdict and required amendments

The architecture has sound foundations: existing T1 identity reuse, scoped stages, raw evidence preservation, deterministic construction, connected-overlap checks, separate rubric and pairwise methods, fresh evidence for later stages, and no comparison of independent track scores as if globally calibrated.

The following amendments make it implementable and remove ambiguity. Record these in `docs/T2-DECISIONS.md`; update the working `JUDGING.md` before implementing affected algorithms. Preserve the two original proposals under `docs/proposals/`.

| Finding | Location in team documents | Required decision |
|---|---|---|
| Pairwise boundary variance omits covariance | Implementation §28 / Phase 24; JUDGING pairwise advancement | Use covariance of the difference, not the sum of marginal variances alone. Details below. |
| “95% stability” would overstate the proposed calculation | BT, exploration, advancement | Penalized Hessian intervals are model-based approximations. Repeated adaptive checks and selection of the boundary do not automatically give 95% frequentist coverage. Label the stopping rule heuristic; persist uncertainty when budget ends. |
| Global calibration wording conflicts | JUDGING §0, §0.1, §20, §25, §37 | Organizer chooses whether overall results are needed and the allowed overall policy. The engine decides whether evidence supports global WLS. No checkbox may force unsupported calibration. Remove the ambiguous `global_calibration` boolean or redefine it as a calculated status. |
| “Evidence sufficiency” lacks an executable definition | Overall decision phases | Require compatible rubric meaning/ranges/weights, completed-evidence connectivity, numerical diagnostics, and declared model assumptions. Connectivity alone is identification, not proof of fairness or accuracy. |
| Global WLS path is rubric-specific | Type 2 overall flow | Never run WLS on pairwise theta values. Separate pairwise track graphs cannot be aligned merely because they share judges. Use a fresh overall stage when those graphs contain no cross-track comparisons. |
| Review denominator is overloaded | JUDGING §15–16; implementation Phases 27–28 | Use actual included completed reviews `m_p` in averages and SD. Target `R` is an assignment/completion requirement. Normal completion requires `m_p=R`; historical data can have different counts. |
| R=1 and J=1 need explicit policies | Feasibility/calibration | One judge has offset zero by convention. Multiple judges with R=1 provide no overlap calibration; report uncalibrated/unsupported. Do not claim successful normalization. SD with one review is null. |
| Greedy failure is called mathematical infeasibility | Assignment repair phase | Distinguish proven infeasible constraints from bounded construction failure. Both commit nothing, but the latter does not prove no valid solution exists. |
| Exact parity can conflict with eligibility and frozen dropout evidence | Assignment/dropout | Strict parity belongs to a defined scope. Revalidate it; do not silently relax it or erase completed work. Default repair either maintains constraints or blocks. Any relaxed policy must be explicit and documented. |
| Exploration priority mixes unlike scales | Protected pairwise exploration | Normalize the unbounded S term, guard zero median SE, define comparison counts, and reserve exploration slots. A positive exploration term alone does not prevent starvation. Version these changes. |
| “Adaptive additions disconnect the graph” is misleading | Connectivity protection | Adding edges cannot disconnect an existing graph. Validate completed evidence, especially after exclusions/dropout; unfinished scheduled edges are not evidence. |
| Mutable draft versus immutable evidence needs a boundary | Review/state phases | Drafts may change. Submitted evidence cannot be edited in place. Corrections/exclusions require separate audited records and new calculations. |
| Scope/version uniqueness is underspecified | Domain model | Event+judge+project uniqueness blocks repeated stages. Stage+judge+project uniqueness must survive assignment repair versions. See schema section. |
| Fixture intent is broader than the actual file | Fixture/scaling sections | Preserve all 41 records, not 40. There is no assignment manifest; missing intended reviews and exact original workload totals cannot be reconstructed honestly. |
| T2-critical operations arrive too late | Final implementation order | Move security, progress, exports and offline verification into the rubric milestone, before optional pairwise work. |
| Hashing is described without canonicalization details | Tie/finalization sections | Define field encoding, sort order, version, number serialization and hash exclusions. A snapshot hash detects changes; it is not a signature or external proof of authenticity. |

### Further decisions to make explicit

1. **Conflict of interest:** exclude a judge from their own team's submission; for a pair, exclude a judge conflicted with either entry. If dual organizer/judge roles are allowed, show that organizers have privileged access. For ordinary judging-integrity demos use distinct accounts. Never promote a judge to organizer to fix access.
2. **Track visibility:** restrict judging APIs, private project material, assignment lists, scores, calculations and exports by event/stage/track/assignment. T1's public gallery is inherently public; do not pretend a judge cannot view publicly published projects by logging out. Document that public information does not expose private judging data. Authenticated judge views should respect their judging scope.
3. **Publication:** organizers can inspect private results; judges cannot see peer ballots. A public results page is a separate explicit publication action and contains only a whitelisted outcome, never raw reviews, offsets or private comments.
4. **Deadlines:** submission close and judging close are different fields. Judges must be able to judge a project after submissions close. Every write checks server time and state transactionally.
5. **Small populations:** reject empty judging stages. For a one-project pairwise population, no pair exists; report `NO_COMPARISON_REQUIRED` and apply a documented advancement policy instead of fitting a fake model.
6. **Participant edits during judging:** freeze the version of project content entering a stage. Judges must evaluate the same content even if a future workflow permits subsequent edits.

## 4. Use a new Antigravity chat, with a repository handoff

Use the existing T1 chat once more to generate a handoff, then start **one new T2 chat in the same project/workspace**. This is a context-management recommendation, not a claim that Antigravity requires it. A long T1 conversation may contain obsolete requirements and tentative schema decisions. A new chat with audited files is easier to control.

Do not create a new Next.js app, duplicate the repository, or assume a new chat remembers the old one. Do not run both chats editing the same files concurrently.

### Step 1 — paste this into the old T1 chat

```text
We are moving from T1 to T2 in a new conversation in this same repository.
Do not implement features or refactor anything in this step.
Inspect the current repository rather than relying on conversation memory.
Create docs/T1-HANDOFF.md with:
1. Installed framework, runtime, ORM, auth and database versions; package manager.
2. Current routes and navigation for visitor, participant, judge, organizer, admin.
3. Actual models, schema path, migration history and important unique constraints.
4. Actual authentication entry points, server authorization helpers and event roles.
5. Organizer request/approval flow and judge invitation/track-access flow: what
   works, what is incomplete, and concrete code paths.
6. Event configuration/date handling, teams, project drafts/final submission,
   deadline enforcement, uploads and public-gallery behavior.
7. Fixture import strategy, source hash/counts, preservation of original IDs,
   existing historical reviews, rubric assumptions and duplicate handling.
8. Docker/Compose services, health checks, seed entry point, local DB connection
   conventions and volumes. Do not print secrets or full connection credentials.
9. Existing .dogfood.toml routes and credential mechanism; verification commands.
10. Tests actually run and their results; known failures; unfinished T1 work.
11. Current UI design tokens/components and screenshots if available.
12. Relevant uncommitted changes and a safe checkpoint recommendation.
For each claim cite a real file path. Separate observed facts from recommendations.
Do not describe a proposed feature as implemented. Finish with a short handoff.
```

### Step 2 — checkpoint the project

Save your files. In Antigravity's terminal run `git status` and inspect changes. Create a T1 checkpoint commit through your normal Git workflow after checking that `.env`, production secrets and database dumps are excluded. If this is not yet a Git repository, have Antigravity set up local Git and the ignore file first. No database reset is needed.

Back up the local database before applying T2 migrations. Ask Antigravity to use the actual Compose service/user/database names it discovers and to provide the matching backup and restore commands. A PostgreSQL backup is separate from a Git commit. Do not run `docker compose down -v` on your only data volume.

### Step 3 — put the documents in the repository

Use these paths, or equivalent existing documentation conventions:

- `docs/T1-HANDOFF.md`
- `docs/proposals/T2_IMPLEMENTATION_PLAN.original.md`
- `docs/proposals/JUDGING.original.md`
- `docs/T2-REVIEWED-PLAN.md` — this guide
- `docs/T2-DECISIONS.md` — approved implementation policies/amendments
- `docs/T2-STATUS.md` — completed stages, checks and next step
- `docs/official/spec.md`, `docs/official/run.py`, `docs/official/fixtures.json` — original downloaded files

If official files already live elsewhere, keep one authoritative copy and record its location. Root `JUDGING.md` must ultimately describe the implemented mathematics and actual limits, not promise every feature in the proposal.

### Step 4 — paste this first into the new T2 chat

```text
You are extending the existing DOGFOOD application to T2. Work in this repository.
Do not generate a new app. Keep the installed Next.js/TypeScript/PostgreSQL/Prisma/
Better Auth/Tailwind/shadcn stack and existing working T1 behavior.
Read docs/T1-HANDOFF.md, docs/T2-REVIEWED-PLAN.md, the original team proposals,
actual Prisma schema/migrations, package.json/lockfile, authorization helpers,
Compose/Docker files, fixture seed code, .dogfood.toml and relevant tests.
Official requirements determine the tier. This reviewed plan resolves identified
ambiguities in the team proposal. The repository determines integration details.
Do not let an old proposal override a documented correction. Record decisions.
Everything required at runtime must work locally without Internet. Judges are
humans; do not add LLM judging, cloud APIs, hosted DB/auth, Redis or a new service.
Use existing event roles and identities. Enforce access in server services as well
as routes/actions. Preserve fixture IDs, dates, historical evidence and T1 data.
Implement only the stage requested in each prompt. Complete its meaningful tests,
report actual outputs and update docs/T2-STATUS.md before moving to another stage.
Never fake acceptance reports, silently reset the database, edit the official
runner, relax R/eligibility, or substitute UI hiding for authorization.
First execute C0 from the reviewed plan. Do not start C1 yet.
```

Feed the remaining prompts **one at a time**. After each, inspect the changed screens and test report, then make a checkpoint commit. “Stage complete” is meaningful only when its gate passes or a remaining failure is explicitly recorded. If a failure blocks a gate, ask for that failure to be fixed rather than piling the next feature on top.

## 5. Architecture and database prescription

### Keep one application

Next.js handles pages and API routes/server actions; server services implement permissions and transactions; pure math modules compute assignments and results; Prisma persists to local PostgreSQL. No calculation should require an external network request. For fixture-size calculations a synchronous server calculation is reasonable. Introduce a worker only if measured runtime requires one, not speculatively.

Illustrative modules, adapted to your actual layout:

- `server/judging/authorization.ts`
- `server/judging/stages.ts`
- `server/judging/assignments.ts`
- `server/judging/reviews.ts`
- `server/judging/calculations.ts`
- `server/judging/exports.ts`
- `lib/judging/math/{rubric,overlap,wls,ranking}.ts`
- Later: `lib/judging/math/{pairs,bradley-terry,adaptive}.ts`

Use the installed ORM/auth versions. Antigravity must check version-matched official documentation when it needs an unfamiliar API; it must not upgrade packages just because a generated example expects another version.

### Logical schema

These are relationships and constraints, not a replacement Prisma file. Antigravity must map them to the real T1 schema before migrating.

| Model/concept | Key data and constraints |
|---|---|
| Existing User/auth/Event/Track/Team/Project | Reuse. Preserve existing IDs, ownership, sessions, deadlines and team structure. No separate JudgeUser identity. |
| Event judge membership/invitation | Reuse T1 event roles and invitation models. Event-scoped status, normalized invite email, inviter, expiration, hashed token if used. Accept using matching authenticated identity. |
| Judge track eligibility | Unique event+judge+track; all belong to same event. Overall eligibility is explicit stage membership, not implicit access to every track. |
| JudgingRound, if needed | Groups track stages at the same logical sequence; unique event+sequence. Avoid equating every track with a different competition round. |
| JudgingStage | Event, round/sequence, method, scope (`EVENT`, `TRACK`, `OVERALL`), scope key, optional track, state, revision, configured R/budget, dates, seed, algorithm version, output policy. Unique event+round+scopeKey. CHECK scope/track consistency. |
| StageProject | Unique stage+project; immutable project-content snapshot/version at configuration freeze; eligibility/exclusion provenance. Project must belong to stage event and correct track unless authorized overall scope. |
| StageJudge | Unique stage+user; active state, capacity, eligibility snapshot. Existing event judge membership required. |
| RubricVersion | Immutable once frozen, stage link, version/hash. Prefer integer weight basis points totaling 10,000. |
| RubricCriterion | Unique rubricVersion+key; title, help text, order, weight, minimum/maximum, permitted step. Initial implementation uses zero minimum and positive maximum; no undeclared scale assumptions. |
| AssignmentRun | Stage, monotonically increasing version, seed, algorithm/config/input hashes, diagnostics, actor, reason, createdAt. Unique stage+version; append new runs for repairs. |
| RubricAssignment | Stable stage+project+judge unique triple, status, created run, cancellations/reinstatements logged. Historical versions reference this logical assignment rather than creating duplicate active work. |
| ReviewDraft | Assignment owner, scores/comment, revision, updatedAt. Mutable only while authorized and stage open. May be the draft state of a review table if constraints are equivalent. |
| StageReview | Unique assignment, stage/project/judge, immutable submittedAt and rubric version. Final criterion values stored exactly. Submitted evidence must match assignment identity. |
| CriterionScore | Unique review+criterion; criterion belongs to review's frozen rubric version. Finite value within allowed range/step, checked server-side. |
| EvidenceExclusion/Correction | Append-only reason, actor, original evidence reference, effective calculation revision. Never overwrite raw evidence to fix a result. May defer UI for corrections if unsupported explicitly. |
| CalculationRun | Stage/scope, method/config/input hash, implementation version, status, diagnostics, started/finished dates. Unique idempotency key for same input+configuration+algorithm. |
| JudgeCalibration | Calculation+judge unique; offset, review count, diagnostics. Server-private. |
| ProjectResult | Calculation+project unique; actual review count, raw mean, normalized unclamped mean, displayed mean, SD/null, rank and tie key. Later pairwise fields remain method-specific. |
| FinalizationSnapshot | Stage/calculation/config/evidence snapshot, canonical hash, finalizedAt/by, immutable. Separate from public publication. |
| ResultPublication | Approved finalization reference, public whitelist payload, publication timestamp. No peer review/identity leakage. |
| AuditEvent | Append-only event/stage/action/actor/time/reason/revision metadata. Private; omit credentials and invite token values. |

Prisma application validation is not a substitute for database uniqueness and foreign keys. Use composite event/stage foreign keys where practical to prevent cross-event associations. Some CHECK constraints or partial unique indexes need SQL migrations; document those alongside Prisma. PostgreSQL nullable uniqueness needs care: use a non-null `scopeKey`, not only a nullable track ID to enforce event-scope uniqueness.

For calculations, raw criterion inputs and weights can use Decimal/integer representations; solver inputs use finite double precision. Persist sufficient precision, solver version and input hash. Format rounded numbers only at presentation time. Reproducibility means identical results in the pinned supported runtime, not bit-for-bit equality across every numerical library and CPU ever made.

### Historical fixture reviews

If T1 already has `Review` and `CriterionScore` for imported data, do not rewrite history to fit newly generated stages. Two valid migration approaches:

1. Extend the existing model with an explicit legacy/import origin and nullable stage/assignment references plus appropriate conditional constraints.
2. Keep the existing imported review model as historical evidence and add stage-specific final reviews, with a shared read/calculation adapter.

Choose after the audit. The second is a separation of historical evidence from a new review lifecycle, not permission to duplicate users/projects/events. Preserve stable fixture mapping and all 126 reviews. Existing `(event, judge, project)` uniqueness may remain for legacy rows; new stage reviews need stage-aware uniqueness.

An explicit historical analysis can use imported reviews and a separately declared analysis rubric. It does not satisfy a new stage's assignment or completion counters. Historical score access for the correct fixture judge must continue to work through the same real authorization mechanism.

### Optional pairwise tables

Add only in A1:

- `Comparison`: stage, canonical distinct project pair (`lowId`, `highId`), unique stage+pair.
- `ComparisonAssignment`: comparison+judge unique across the stage, created batch/run, assigned display orientation, state. Different judges may review the same pair; the same judge does not repeat it by default.
- `ComparisonOutcome`: unique assignment, selected winner restricted to that pair, immutable submittedAt.
- `PairwiseBatch`: INITIAL/ADAPTIVE, version, input model hash, schedule rationale, targets and budgets.
- `PairwiseModelResult`: calculation+project theta and uncertainty; covariance or sufficient contrast data in a versioned model artifact.

A judge's eligibility must cover **both** projects. Do not implement pairwise as two fake rubric reviews.

## 6. Core mathematics to implement and defend

### Rubric score

For zero-based criteria with positive maxima and weights summing to one:

`r(p,j) = 100 × Σ_c weight_c × score(p,j,c) / max_c`.

Example: weights 60%/40%, both maxima 5, scores 4 and 3 yields **72**. Reject missing/extra criterion IDs, NaN/infinity, negatives, out-of-range scores and invalid steps. Store weights as basis points summing exactly to 10,000 to avoid “99.999999%” validation surprises.

If a later feature supports arbitrary minima, explicitly change the transform to `(score-min)/(max-min)` and version that policy. Do not silently mix these formulas between stages.

### Assignment constraints

For rubric stage population N, active panel J, required reviews R:

- Require `N>=1`, `J>=1`, `1<=R<=J`, sufficient capacity and at least R eligible non-conflicted judges per project.
- Target assignments `A=N×R`. Normal finalization needs R distinct submitted reviews per project.
- Within the selected parity scope, loads are `floor(A/J)` or `ceil(A/J)`, with exactly `A mod J` judges receiving the larger load.
- If the configuration requires every selected judge to work, require `A>=J`; otherwise explicitly represent zero-work panel members and exclude them from calibration parameters.
- For R>=2, `N×choose(R,2)>=J-1` is a necessary edge-count condition for a connected judge graph, not a sufficient feasibility test.
- `J=1` is a trivial single-judge case; avoid dividing by `choose(J,2)=0` in overlap objectives.

Construct hard-feasible assignments first, then optimize overlap. A deterministic bipartite flow/b-matching approach with project demand R and judge lower/upper quotas is a useful hard-constraint constructor. Connect/repair the resulting overlap graph with bounded deterministic swaps, preserving all hard constraints. If using the team's greedy constructor instead, return `CONSTRUCTION_FAILED` when bounded repair is exhausted; do not label every failure a proof of infeasibility.

Optimize `Σ(i<j)(Oij-P)^2`, with `P=N×choose(R,2)/choose(J,2)`, only after constraints and required connectivity hold. Connectedness is mandatory for a requested shared calibration; equal overlap counts are an optimization, not a promise.

Persist stable input order, seed, algorithm version and selected assignments. A repair never rewrites completed work. Multi-track capacity checks must also consider total workload across tracks; local parity alone does not ensure global capacity.

### WLS calibration

Use completed included rubric reviews only. Assume `r(p,j)=quality_p + bias_j + noise`.

For judges i,j sharing projects, compute overlap count `ωij` and mean score difference `dij`. Estimate offsets by minimizing:

`Σ(i<j) ωij × ((b_i-b_j)-dij)^2`, subject to `Σ_j b_j=0`.

Build weighted Laplacian L and right-hand side v using each shared project difference: for edge i,j, add ω to both diagonals, subtract it from both off-diagonals, and add/subtract `ω*dij` to v. Solve the constrained linear system:

`[L 1; 1ᵀ 0] [b; multiplier] = [v; 0]`.

Use a tested linear solver with pivoting or an equivalent stable constrained solve. Do not calculate an explicit matrix inverse just to solve offsets. Validate finite outputs, sum-of-offsets tolerance and residuals. Sort inputs for repeatability. Scale tolerances to matrix/data magnitude and record them; suggested small-data test tolerance is `1e-8`.

A graph edge with one shared review remains evidence. Count weights follow the proposed equal-noise model, but pair-difference edges can be correlated because they reuse reviews. Do not claim this graph estimator supplies independent uncertainty estimates or guarantees removal of malicious scoring. Additive offsets address average harshness/generosity, not judge-specific slopes, strategic collusion or arbitrary taste differences.

For each project with m included reviews:

- `normalizedReview = rawReview - judgeOffset`
- `F_raw = sum(normalizedReview)/m`
- `F_display = min(100,max(0,F_raw))`
- `SD = sqrt(sum((normalizedReview-F_raw)^2)/(m-1))` if m>=2, else null.

Rank using F_raw descending, without rounding or clamping first. A displayed tie is not necessarily an internal tie. Missing review is absence, never zero. Normal finalization blocks until target R is met; an explicit historical analysis can use uneven m without pretending assignments were completed.

**Golden example:** A scores projects X/Y as 80/60; B scores them 60/40. The estimated biases are +10/-10, normalized project scores are 70/50, and each project's normalized disagreement SD is zero.

**Unsupported calibration:** for multiple disconnected judge components, return diagnostics and request additional eligible bridging reviews/new stage. Do not merge component-relative scores into a global ranking. R=1 with multiple judges is uncalibrated unless separate shared calibration evidence is explicitly part of the model. A one-judge stage may report offset=0 and `SINGLE_JUDGE`, not “bias corrected.”

### Tie and finalization policy

Use the team's hash tie-break only for exact persisted internal equality. Define `canonicalEncode` explicitly, e.g. UTF-8 JSON encoding of the ordered string array `[eventId, judgingVersion, projectId]`; never ambiguous string concatenation. `judgingVersion` must identify the frozen stage policy and must not be regenerated repeatedly to obtain a preferred tie result. Sort hex digests/bytes ascending consistently.

A finalization snapshot records evidence IDs and values, rubric, algorithm, exclusions, assignments, results and diagnostics in stable order. Exclude its own hash and non-deterministic generation metadata from the hashed payload, or include persisted metadata deterministically. Hashing proves reproducibility/change detection within this system; it is not cryptographic authentication of who judged.

## 7. Fixture findings and normalization demonstration

Actual downloaded data:

| Item | Observed |
|---|---:|
| Tracks | 8 |
| Judges | 30 |
| Teams | 40 |
| Project records | 41 |
| Reviews | 126 |
| Criterion values | 378 |
| Projects with 2/3/4/5 reviews | 8 / 26 / 3 / 4 |

All 41 projects have at least one recorded review. The 41st record duplicates the team/title/repository of project 7 while retaining its own ID. Keep both records; flag suspected duplicate for organizer review. Never collapse them silently or let unique(teamId) prevent import.

The fixture has `functionality`, `quality`, and `innovation`; observed values are 2–5. Observed minimum 2 is not proof the rubric starts at 2. The JSON does not provide authoritative criterion weights, a complete allowed scale, or original assignment totals. Document an analysis choice, such as equal weights and maximum 5, instead of calling it supplied policy.

I computed the graph from completed reviews: all 30 judges form one connected global component, and each of the eight within-track completed-review graphs is connected. This establishes connectivity for the reviewed data, not proof of statistical fairness. A graph built from planned assignments would be a different object.

As a reproducibility reference, using **equal criterion weights and max 5 as explicit analysis assumptions**, global WLS over all 126 preserved reviews gives:

| Project | Raw mean | Globally adjusted mean |
|---|---:|---:|
| prj_01 | 68.888889 | 70.103769 |
| prj_02 | 71.111111 | 66.173796 |
| prj_03 | 66.666667 | 65.786643 |
| prj_07 | 66.666667 | 72.002500 |
| prj_41 | 76.666667 | 77.917430 |

These are independently calculated reference outputs, not results from your app. Small solver tolerance differences are acceptable. A different declared rubric or evidence scope should produce different results. The example shows a ranking change between prj_01 and prj_02; it does not establish which project deserves to win.

For the optional normalization proof, provide a full fixture comparison export and a synthetic benchmark with known project qualities and injected judge offsets. Show a successful recovery case, a sparse/noisy case, a disconnected case and constant-score behavior. Never claim that moving rankings proves improved accuracy when fixture ground truth is unknown.

There is no manifest of missing assignments in the JSON. Historical progress should say “126 imported reviews; original assignment totals unavailable.” Use a separate clearly labeled demonstration event to show 0%-started, partial, complete and dropped-out judges. Do not fabricate historical completion percentages. A judge with only one observation is not enough evidence to diagnose a constant scoring habit.

## 8. Core implementation stages — paste in order

### C0 — inspect and protect the working T1

**Purpose:** establish facts and remove blockers before modifying the schema. A handoff is useful context; code inspection remains necessary.

```text
Execute C0 only.
Audit the current T1 repository and compare it to docs/T1-HANDOFF.md. Read the
reviewed T2 plan and original team proposals. Produce docs/T2-IMPLEMENTATION-MAP.md
mapping required features to existing models, server services, APIs and screens.
Identify whether organizer approval, judge invitation/track grants, event dates,
fixtures, deadline checks and offline packaging are actually implemented.
Check exact versions and package scripts. Record the current migration state and
review uniqueness constraints. Find every endpoint/action exposing scores or
private project content. Do not print secrets.
Run the existing relevant checks and official runner if the local app is ready.
Save actual baseline output separately; do not overwrite it with invented PASS.
Make docs/T2-DECISIONS.md with the reviewed amendments and any repository-specific
integration choices. Separate core T2 from optional advanced features.
Provide exact database backup/restore commands using discovered service names.
Do not reset data, replace the application, or add T2 features yet.
Finish with blockers, the proposed smallest additive migration, and C0 status.
```

**Gate:** actual architecture and baseline known; backup procedure available; official fixture and existing T1 state preserved. If Docker/seed never worked, repair that early as part of C1 rather than leaving it for the last hour.

### C1 — migrations, local runtime and historical compatibility

**Purpose:** add the rubric stage lifecycle without losing T1 or fixture evidence.

```text
Execute C1 from docs/T2-REVIEWED-PLAN.md.
Implement the audited additive schema for rubric stages, frozen stage populations,
stage judges, rubric versions/criteria, assignment runs/logical assignments,
drafts/final reviews, criterion scores, calculation/results, audit and finalization.
Reuse existing platform identities/events/projects/event roles and invitations.
Choose and document the historical-review migration strategy. Preserve the
original fixture records and their IDs; historical evidence must not count as new
stage completion. Remove/replace only constraints that genuinely block the model.
Enforce stage/event/track consistency, appropriate uniqueness, and rubric references.
Do not add pairwise tables yet unless already present and harmless.
Create versioned migrations. Verify against a disposable migrated copy of T1 data
and a new empty test database, never reset my main database. Check seed idempotency.
Make the existing Compose startup migrate and seed locally using bundled artifacts.
Keep credentials in the established local configuration and logs appropriate to
local demo mode. Preserve Better Auth sessions and fixture acceptance identities.
Add a clearly separate demo judging event with a small deterministic dataset;
leave the official fixture event and its closed date intact.
Update DATA-MODEL.md and docs/T2-STATUS.md with exact changes and observed results.
```

**Gate:** old T1 data survives upgrade; new DB boots; rerunning seed duplicates nothing; all 41 fixture projects/126 historical reviews preserved; new stages start with zero completed reviews.

### C2 — organizer configuration, invitations and stage state

**Purpose:** organizers can prepare real judging through the interface.

```text
Execute C2 only.
Extend the existing organizer event workspace with Judges and Judging setup.
Reuse the email invitation/access-grant flow. Existing users and not-yet-registered
email invitations must work using the actual T1 identity model. In offline mode
provide a copyable invite/acceptance URL or local inbox; do not require email SMTP.
Do not send real email. Accept invites only for the intended authenticated identity;
organizer grants and invitation acceptance must not create global organizer access.
Support judge activation/suspension and explicit event/track eligibility.
Implement rubric-stage creation with scope, eligible project population, panel,
R, capacities, judging dates, weighted criteria and output policy. Exclude conflicts.
Use integer weight basis points totaling 10000; use zero-based score ranges for
this version. Validate all fields on the server and show useful form errors.
Implement an explicit state machine: DRAFT -> CONFIGURED -> ASSIGNING -> OPEN ->
CLOSED -> CALCULATING -> CALCULATED -> FINALIZED. If existing names differ, map them.
Configuration revisions before OPEN invalidate stale assignment previews. Once
OPEN, freeze rubric/panel/population snapshots. Failures retain recoverable state
and diagnostics; no permanent ASSIGNING state after an exception.
Keep judging deadlines separate from submissions_close. Show timezone/date labels.
Use revision checks and transactions for changes; audit material state changes.
Test cross-event organizer access, invite misuse, bad weights, frozen-config edits,
invalid dates, and stale/concurrent configuration updates.
Update status and document the state transitions actually supported.
```

**Gate:** organizer can create a valid stage and cannot open an invalid one; ordinary participant cannot configure; Track A grants do not grant Track B.

### C3 — deterministic rubric assignments

**Purpose:** create fair, usable workloads and enough overlap to calibrate.

```text
Execute C3 only.
Implement pure rubric assignment/feasibility modules following the reviewed plan:
exact R distinct judges, eligibility/conflicts, capacities, declared parity scope,
seeded stable construction, completed/planned graph distinction, and overlap loss.
Validate N/J/R and all-project eligible judge counts, not just total capacity.
Require connected planned overlap for shared multi-judge calibration. Handle J=1
and R=1 explicitly. Never silently reduce R or alter eligibility.
Use deterministic hard-constraint construction, then bounded connectivity repair
and overlap optimization. Return distinct INVALID_CONFIG, INFEASIBLE and
CONSTRUCTION_FAILED diagnostics where supported; a greedy failure is not a proof.
Provide organizer Preview and Commit actions. Preview includes per-project R,
per-judge loads, connectivity, conflicts and failures. Commit uses a transaction,
configuration/input hash and idempotency protection. Double clicks cannot create
duplicate work. A stale preview cannot be committed after panel/population changes.
Assignment versions preserve a stable logical stage/project/judge identity.
Test exact R, distinctness, deterministic output with shuffled DB input order,
parity, capacity, conflicts, disconnected graphs, no partial commit on failure,
and concurrent repeated assignment requests. Add a feasible example and an
eligibility-constrained impossible example. Report results and update status.
```

**Gate:** every assigned project has R distinct eligible judges, all constraints hold, and identical inputs reproduce assignments. Invalid requests write no partial assignment set.

### C4 — private judge workbench and submitted reviews

**Purpose:** judges can evaluate assigned projects without receiving private peer data.

```text
Execute C4 only.
Implement the judge home and rubric review workbench backed by C3 assignments.
Show event/stage/track context, judging dates, required work, submitted/remaining,
project snapshot, local assets, frozen rubric guidance, draft-save and submit.
Do not expose peer reviews, aggregates, offsets, rankings, overlap graphs, private
organizer notes or other-track judging data in JSON, HTML, RSC props or caches.
Create reusable server authorization used by every route, action and query. Check
identity, event role, stage membership, track eligibility, assignment ownership,
stage state, judging time and rubric version before reading/writing private data.
Explicit peer score requests by a judge return 403; unauthenticated requests 401.
A participant receives 403 on judge APIs; do not redirect API clients to login HTML.
Own-score reads must return the real authenticated judge's historical/new scores
as appropriate. Never trust a judgeId from the client as the acting identity.
Drafts are mutable with revision control. Final submission validates all criterion
keys/values and commits once transactionally. Retry of identical submission is
idempotent; an attempted edit after submission returns 409. Reject stale drafts,
closed-stage writes, score NaN/out-of-range and assignment ID tampering.
Use the existing session/CSRF/origin protections; test direct requests independent
of the UI. Scope private responses/caches so one user's data cannot reach another.
Add tests for peer, participant, cross-event, cross-track, unassigned project,
forged judge ID, concurrent submit, and no score leakage through project detail.
Update status with actual results and route mapping for the official runner.
```

**Gate:** real end-to-end rubric review works; direct unauthorized requests fail; accepted evidence survives refresh/restart and cannot be overwritten.

### C5 — WLS, diagnostics, ranking and finalization

**Purpose:** a defensible calculation produces stable private results.

```text
Execute C5 only.
Implement pure weighted rubric score, completed-review graph, constrained WLS,
normalization, disagreement, rank and deterministic tie modules from the reviewed
plan. Preserve raw evidence. Use actual included review count m, not target R, in
averages; normal stage completion still requires R. SD for m=1 is null.
Use completed included evidence, never draft values or planned graph edges.
Solve offsets stably with sum(b)=0. Validate residual, finite values and connectivity.
Return clear unsupported statuses; no fake zero-bias successful calibration for
multiple disconnected judges. Record additive-model limitations.
Persist versioned calculation inputs/hash/results/diagnostics. Repeated identical
calculation is idempotent. Detect evidence or configuration changes and invalidate
stale results. Compute outside long transactions when appropriate, then commit only
if the input revision still matches. Do not rank on rounded/clamped scores.
Implement close/calculate/finalize with server-side gates. Incomplete stages cannot
silently finalize. Finalization captures immutable inputs/results and canonical
hash; public publication remains a separate later action.
Expose an organizer-only explainability view: raw versus normalized, judge offsets,
review counts, connectivity, SD and clearly worded limitations. Judges get none of it.
Add a separately labeled fixture analysis using declared equal weights/max5; it
must not alter imported scores or claim new assignment completion.
Test 72-point rubric example; biases +10/-10 and results 70/50; disconnected graph;
constant judge scores; uneven m; m=1; score clamping only after aggregation;
deterministic ties; stale calculation and denied private result access.
Document implemented math in root JUDGING.md, not unimplemented future features.
```

**Gate:** toy results correct; fixture handling honest; unsupported evidence produces explanation; finalization and ranking reproducible.

### C6 — organizer progress, repair, CSV and publication

**Purpose:** complete the operational T2 workflow before advanced algorithms.

```text
Execute C6 only.
Add organizer progress with server-derived per-stage, per-judge and per-project
assigned/submitted/remaining counts; distinguish not started, draft/in progress,
submitted, cancelled and unavailable. Poll every roughly 5-10 seconds with proper
loading/error states; no websocket service required. Count submitted evidence only
as completed. Include zero-progress judges. Historical imports with unknown original
assignment totals must not display fabricated completion percentages.
Implement strict dropout repair: preserve completed evidence, cancel/reassign only
unfinished work using new run/audit records, distinct eligible replacements and
capacity checks. Preserve prior snapshots. If constraints cannot be satisfied,
show actionable failure; do not silently relax parity/R or finalize anyway.
Implement organizer-only CSV exports of assignments, criterion-level raw reviews,
normalization diagnostics and results for each stage, plus historical data exports.
Use stable ordering, UTF-8, correct CSV quoting for commas/quotes/newlines, safe
spreadsheet handling of user-entered formula-like text, and no secrets/tokens.
Include event/stage/scope/version IDs, evidence counts and statuses. Empty exports
still have real headers. Never label incomplete/calibration-unsupported scores final.
Add separate Publish action for finalized whitelisted results. Public output may
contain placement/project/approved award/displayed score but no individual judge
ballots, comments, offsets, credentials or audit snapshot. Keep peer scores private.
Test progress transitions, dropout preserving submitted evidence, duplicate repair
requests, unauthorized CSV, CSV special characters and publication before finalization.
Update documentation and status with working paths and limitations.
```

**Gate:** organizer can see who has not started, obtain meaningful CSV at each stage, repair or explicitly diagnose dropout, and publish sanitized finalized outcomes.

### C7 — finish the black-and-red judging experience

**Purpose:** make existing functionality clear and usable; do not redesign working T1 from scratch.

Suggested tokens: background `#09090B`, panel `#141418`, border `#2A2A31`, primary text `#FAFAFA`, muted text `#A1A1AA`, action red `#DC2626`, brighter red accent `#F87171`. Verify actual contrast combinations. Do not use red alone to convey every status. Keep success, warning and danger distinguishable with text/icons.

```text
Execute C7 only, reusing the current T1 design system.
First inventory the current judging routes/components and show a short UI map.
Apply a coherent black/red theme with readable surfaces and existing local fonts.
Use local font files or a system stack; no Google/CDN fetch at build or runtime.
Organizer: Judging overview, Setup, Judges, Assignments, Progress, Results and
Exports must form a clear workflow. Show stage state, dates/timezone, next valid
action, validation blockers, incomplete evidence and calibrated/unsupported status.
Judge: focused assignment list and project review screen with rubric help, clear
selected values, draft/save feedback, submitted read-only state and remaining work.
Public result view must use only the approved publication payload.
Provide useful empty states with a valid action; do not fill real dashboards with
invented metrics. Add loading/error/retry states and explicit validation text.
Use responsive layouts, accessible labels, keyboard focus, touch-friendly controls,
reduced-motion support, readable tables and restrained transitions. Avoid an entire
page of red text or excessive glow. Preserve working event/participant/admin flows.
Capture representative organizer/judge/mobile screenshots if available. Verify
no external runtime assets and no private score data in public rendering.
Update status; do not add optional pairwise features in this step.
```

**Gate:** every role has a meaningful entry page; dates and state are visible; long titles/errors work; UI reflects actual backend permissions and stored data.

### C8 — security, official acceptance, offline startup and delivery

**Purpose:** establish a release checkpoint with honest evidence.

```text
Execute C8 only.
Run the core security and mathematical test matrix from the reviewed plan, current
T1 regression checks, typecheck/build and one full create/submit/judge/publish flow.
Use actual commands from this repository; add missing meaningful tests where needed.
Configure .dogfood.toml to real implemented routes and seeded normal-role identities.
The peer_scores URL must genuinely address judge A's scores and reject judge B with
401/403. A judge A request to that same resource must succeed. No magic bypasses.
Run the unmodified official run.py against the real seeded app and commit its exact
stdout as acceptance-report.txt. Inspect PASS/FAIL and verified tiers: the runner
can exit zero despite failures. Do not claim correctness just from exit code zero.
Verify clean first startup on a separate disposable Compose project/volume, then
restart idempotency. Verify operation with external networking unavailable using
prepared local images/dependencies, while preserving container-to-container and
localhost networking. Test auth, DB writes, uploads, judging, exports and restart.
Document image/dependency provisioning honestly; a fresh offline laptop cannot
pull missing base images or npm packages. Do not describe warm-cache testing as
proof of cold offline installation. Prepare a distributable image bundle if needed.
Update README, ARCHITECTURE, DATA-MODEL, JUDGING, LICENSE, .dogfood.toml, actual
acceptance report and demo instructions. Clearly mark optional features unshipped.
Produce a concise release report with tested commands/results, current commit,
remaining defects and an accurate tier claim. Do not publish/send anything externally.
```

**Gate:** T1 and core T2 work together; all seven official assertions pass; additional feature/security checks pass; offline operation tested with stated provisioning conditions; documentation matches implementation. Passing seven assertions alone does not establish the entire feature set.

## 9. Optional advanced stages — after the core release checkpoint

These stages preserve your team's innovation. They are not permission to mark core T2 complete before C8. If time runs out, keep optional code behind a disabled feature flag and describe its status honestly.

### A1 — static pairwise mode and Bradley–Terry

Before adaptive scheduling, ship a working alternative mode that can collect evidence and rank. This already covers the essence of the pairwise bonus; adaptive scheduling adds further complexity.

**Concrete design:** canonical unordered pairs; deterministic shuffled initial project order; for N>=3 use a spanning ring to provide initial coverage, then add eligible pairs until configured coverage is met. For N=2 there is one possible pair. Replicate pairs across distinct judges as configured; forbid self-pairs and repeated same-judge/same-pair work. Store a balanced seeded left/right orientation to limit position effects. If constraints prevent this constructor from producing a valid connected graph, fail with diagnostics.

Config fields must include initial minimum completed comparisons per project, judges per pair, total comparison-assignment budget, maximum distinct-judge repeats per pair, per-judge capacity, batch size, advancement rule and stopping policy. Distinguish unique pairs from pair×judge assignment counts. Reject impossible configurations; a budget cannot guarantee eventual statistical certainty.

Use the regularized objective your team chose:

`negativeLogLikelihood(theta) + 0.1 × Σ theta_i²`, with `Σ theta_i=0`.

For an observed winner w over loser l, stable negative log likelihood is `softplus(theta_l-theta_w)`. The penalty gradient is `2λtheta` and Hessian contribution `2λI`. Do not accidentally implement λ/2 while documenting λ.

Fit with a stable constrained optimizer, bounded iterations, convergence/residual checks and recorded tolerances. A regularized disconnected graph can yield finite numbers; that does not make rankings across components evidence-supported. Require connected **completed** comparison evidence for a single global model. Unregularized finite-MLE conditions are stronger than undirected connectivity; regularization prevents infinite fitted values but supplies assumptions, not missing observations.

For an explicit orthonormal basis Q of the sum-zero subspace and penalized Hessian H, approximate constrained covariance as `C=Q (QᵀHQ)^-1 Qᵀ`. A stable solve may replace inversion. Document this as a Laplace/model-based uncertainty approximation, not a universal confidence guarantee. Theta is a relative log-strength, not a percentage or rubric score.

```text
Execute optional A1 only after core C8 is checkpointed.
Implement PAIRWISE as a separate method using shared stage/authorization/audit
infrastructure. Add the reviewed comparison/batch/assignment/outcome schema.
Implement deterministic initial pair generation independent of any BT ranking,
then allocate comparisons through common eligibility/capacity/workload constraints.
Collect human winner choices only; no numeric score, confidence, tie or AI judgment.
Persist assigned left/right orientation and immutable outcomes. Apply both-project
eligibility/conflict checks. Do not leak current model/rank/peer outcomes to judges.
Implement the precisely specified regularized BT objective, constrained solution,
finite/convergence checks and approximate covariance. Persist raw evidence and
model version. Require completed graph connectivity before global ordering.
Add pairwise progress and CSV evidence/model exports for organizers; preserve C8.
Test N=0/1/2 cases, no self-pairs, duplicate same-judge pair, orientation, symmetric
wins, all-win finite estimates, disconnected evidence, deterministic fit and API
isolation. Document implemented limitations and update status. Do not add adaptive
scheduling until this standalone pairwise workflow works end to end.
```

### A2 — corrected adaptive selection and stopping

The team's boundary rule must use:

`SE_difference = sqrt(C_kk + C_ll - 2*C_kl)` for adjacent boundary entries k=K and l=K+1.

Then compare `theta_k-theta_l` with `1.96×SE_difference` as a **heuristic**. With variances .04/.04 and covariance -.03, correct SE is approximately **.374166**, not **.282843**. The omitted covariance materially changes the decision.

Checking only adjacent ranked estimates can miss an outsider with large uncertainty. For a conservative operational heuristic, assess all selected-versus-unselected contrast margins using their covariance and report the minimum margin. This still is not an automatic familywise 95% guarantee. For a rigorously calibrated claim, additional statistical work/simulation is required; do not invent one for the demo.

Version the revised adaptive priority:

- Compute the team's `S_i=max(0,theta_i+1.96*SE_i-theta_K)` and pair average, then normalize S across eligible candidates to [0,1]; if all zero, use zero.
- `B_i=exp(-abs(theta_i-theta_K)/max(median(SE),epsilon))`; average for the pair. Choose/document epsilon, e.g. `1e-8` in the model's units.
- `I_ij=4*p_ij*(1-p_ij)`.
- `E_ij=1/(1+C_i+C_j)`, where C counts completed included comparison outcomes involving the project.
- Priority is `.40*S_normalized + .30*B + .20*I + .10*E`.
- Reserve at least one comparison unit, or 20% of each nonempty batch rounded up, for minimum-exposure eligible projects. Fill the rest by priority with deterministic tie-breaking. This is a proposed explicit amendment to the team's heuristic.
- Account for outstanding assignments when preventing repeats and overscheduling. C itself measures completed evidence; scheduled counts are separate.
- Completed outcomes are append-only. Recheck graph after evidence exclusions. Adding a new pair cannot disconnect an existing graph.

Persist budget, maximum batches, no-eligible-pairs condition, initial-evidence completion rule and stop reason. `1<=K<N` for a real selection boundary; K=N means advance all without claiming separation. If budget ends, record `SHORTLIST_BOUNDARY_UNCERTAIN`; advance by the configured deterministic fallback only if that policy was declared before judging. Expose uncertainty to organizers and in exports.

Example feasible demo preset, not a universal default: N=12, J=6, initial ring with 2 judges per pair =24 assignments, total budget48, adaptive batches6, K=4, sufficient judge capacities and pair eligibility. Other populations need validation rather than copying these numbers.

```text
Execute optional A2 only after A1 passes.
Record the reviewed covariance correction and explicit adaptive-policy amendments
in T2-DECISIONS and JUDGING before coding. Implement normalized priority terms,
zero-SE guards, reserved exploration, deterministic batch selection, repeat limits,
outstanding-assignment accounting and cumulative capacity/workload rules.
Fit only from completed stage-local evidence. Use model-version/hash-based batch
idempotency and stale-model checks. Keep adaptive subphase separate from the stage
OPEN/CLOSED lifecycle; collecting another batch must not require reopening a final stage.
Use covariance-aware boundary contrasts and honestly labeled heuristic uncertainty.
Implement budget/no-eligible-pairs/max-batch stopping, K=N special case and explicit
uncertain-boundary fallback. Never label budget exhaustion as statistical certainty.
Test covariance example, unobserved/high-uncertainty outsider, no starvation within
feasible configured exploration, exhausted repeats, interrupted batch, concurrent
scheduling, preserved previous evidence and deterministic replay. Rerun core guards.
```

### A3 — multiple stages and cross-track overall results

First support one track-scoped stage per track and an explicit next stage. Do not introduce multiple independent judging engines.

**Overall policy:** organizer requests track-only or overall output. If overall is requested, engine may use global WLS only for compatible rubric evidence and validated support; otherwise construct candidates and create a fresh overall stage. The organizer cannot force a successful support verdict. Preserve the selected policy before inspecting results.

Compatibility means comparable criterion semantics, scales and weights, a declared stable additive judge-offset assumption across tracks, relevant completed connected overlap and passing numerical diagnostics. Store the reasons for supported/unsupported. Shared judge identity without actual connecting evidence is insufficient; a connected judge graph cannot make unrelated rubrics measure the same thing.

For independent pairwise tracks, theta values are centered within separate project-comparison graphs. The same judge working in two tracks does not connect those project graphs in a basic Bradley–Terry model. Use fresh cross-track overall comparisons or rubric reviews.

For candidate selection implement fixed-per-track first. Later proportional/hybrid policies require deterministic capped largest-remainder allocation, explicit minima and total capacity, stable tie order, and rejection when minima exceed capacity. Track population is representation input, not quality evidence.

A new overall panel means a newly configured overall judging role/panel and fresh evidence. If you require entirely different people, enforce that as an explicit policy; otherwise document permitted panel reuse and conflicts. Overall access grants do not reveal historical ballots from other tracks.

```text
Execute optional A3 only after the relevant method is tested.
Support configurable stage sequences with explicit project-ID advancement snapshots;
never carry theta, normalized scores or old reviews as numerical evidence into the
next stage. Preserve round/track scope and immutable finalized inputs.
Implement independent track stages/rankings and aggregate capacity validation.
Implement the reviewed evidence-driven overall decision with rubric compatibility,
completed graph/numerical diagnostics and a recorded stable-bias assumption.
Unsupported or pairwise-only disconnected tracks must use configured candidate
selection and a fresh overall stage. Do not compare separate track F_raw/theta.
Start with fixed-per-track quotas and reject unsupported quota modes in UI/API.
If implementing proportional/hybrid quotas, specify rounding/capping/minima and
stable tie handling before coding. Overall judges need explicit overall assignments
and may not read prior private track ballots.
Test track-only completion, shared judges, incompatible rubrics, disconnected
tracks, fresh evidence, repeat judge/project across different stages, no numeric
carryover, invalid quotas and cross-track access. Update docs with supported scope.
```

### A4 — evidence, proof and release again

```text
Execute optional A4 after implemented advanced stages.
Create a reproducible fixture normalization demonstration with explicit rubric
assumptions, raw/normalized scores and rank changes; preserve duplicate records.
Add known-truth synthetic offset recovery, noisy/sparse, constant-score and
unsupported-graph cases. Present results and limitations rather than claiming the
fixture proves real-world fairness. Add organizer-readable anomaly diagnostics
with declared minimum sample sizes/thresholds; no automatic evidence deletion.
Run the meaningful advanced math/property/security/end-to-end checks and rerun C8.
Update root JUDGING to the implemented algorithm versions and every amended rule.
Update the 5-minute demo, tier/bonus claims, export examples and actual acceptance
report. Leave unfinished modes disabled and disclosed. Produce the final release
summary without claiming unrun tests or publishing externally.
```

## 10. Acceptance runner integration — exact behavior

The downloaded runner makes six HTTP calls and reports seven assertions because it reuses the gallery response for the fixture-title assertion. It does not execute browser JavaScript or log in. Supply real working credential headers in `.dogfood.toml`.

| Assertion | Exact expectation in reviewed run.py | Implementation obligation beyond that probe |
|---|---|---|
| Public gallery | Unauthenticated GET returns 200 | Real gallery with published fixture projects, search/filter; no private payload. |
| Fixture content | Body contains any of the first three fixture titles, case-insensitively | SSR/render accessible fixture content. First titles are Glass Signal, Small Meadow, Deep Compass. Preserve the entire fixture, not only these projects. |
| Closed submissions | POST as participant with title/summary gets any 4xx | Actual deadline enforcement on create/edit/finalize; do not rely solely on rejecting an incomplete payload. |
| Own scores | GET as judge_a returns 200 | Return that judge's authorized scores, including mapped historical evidence if appropriate. |
| Peer scores | GET the URL identifying judge A's scores as judge_b returns 401/403 | Check ownership/scope server-side. 404 or a redirect does not satisfy this specific check. |
| Participant blocked | GET own-score route as participant returns 401/403 | Role permission is real and event-scoped. |
| CSV | GET as organizer returns 200 and first line contains comma | Return genuine authorized CSV, correct escaping/columns/data and no secrets. |

The runner does not verify rubric math, assignment quality, CSV content fidelity, invitation UX, live progress or complete track isolation. Your tests and demonstration must cover them. Its exit code can be zero even with FAIL lines; inspect the printed result. T2 verification also depends on T1 passing. Do not modify `run.py` to make your implementation pass.

Illustrative route mapping, to be adapted to your actual app:

```toml
[portal]
base_url = "http://localhost:3000"

[tiers]
claimed = ["T1", "T2"]
pitch = "Offline judging with explicit assignments and auditable judge calibration."

[auth]
organizer = "Authorization: Bearer REPLACE_WITH_REAL_LOCAL_ORGANIZER_TOKEN"
judge_a = "Authorization: Bearer REPLACE_WITH_REAL_LOCAL_JUDGE_A_TOKEN"
judge_b = "Authorization: Bearer REPLACE_WITH_REAL_LOCAL_JUDGE_B_TOKEN"
participant = "Authorization: Bearer REPLACE_WITH_REAL_LOCAL_PARTICIPANT_TOKEN"

[routes]
gallery = "/events/evt_01/projects"
submit = "/api/events/evt_01/projects"
judge_scores = "/api/events/evt_01/judging/my-scores"
peer_scores = "/api/events/evt_01/judges/jdg_01/scores"
csv_export = "/api/events/evt_01/exports/reviews.csv"
```

This is an example, not ready-to-run configuration. A fixture judge ID may map to another internal User ID. Use the real resource identifier and authenticate judge_a as its owner. If your existing mechanism is a Better Auth session cookie, keep it. If local assessment bearer credentials exist, resolve them to ordinary seeded users and run exactly the same permissions as normal sessions. Do not accept a client-supplied role as authority. Demo credentials must not become a production authentication bypass.

From the project root, with official files at the guide's suggested location:

```bash
python3 docs/official/run.py .dogfood.toml --fixtures docs/official/fixtures.json > acceptance-report.txt
```

On Windows the Python executable may be `py` instead of `python3`; use your installed interpreter. Open the generated file and read the final verified-tier line. Never paste a sample report into the file and call it actual output.

## 11. Test matrix with meaningful expected outcomes

Use the test runner already present. Pure math tests need no database; authorization/transaction tests need a disposable local PostgreSQL database; end-to-end tests exercise real pages and requests. Add a property-testing library only if it helps and its dependency can be bundled. Do not spend the release window building a separate test framework.

| Test | Expected result |
|---|---|
| Weights 60/40, maxima 5, scores 4/3 | Raw score exactly 72 to numerical tolerance. |
| Missing criterion, extra foreign criterion, negative or >max score | Rejected; no partial final review. |
| N=4, J=3, R=2 with unrestricted eligibility/capacity | 8 unique assignments; judge loads 3,3,2; connected judge overlap. |
| R greater than eligible judges for one project | Assignment rejected with a useful reason even if total capacity is sufficient. |
| N=1, J=3, R=2 with mandatory all-panel participation | Rejected: cannot use all three judges. If unused members are explicitly allowed, do not invent an offset for the unused judge. |
| Same seed/config with input arrays reordered | Identical assignment and ranked output. |
| Two assignment commits from same preview | One logical result; no duplicate assignments. |
| Configuration changes after preview | Old preview cannot commit. |
| Judge A requests judge B's score resource | 403, not a filtered 200; no private body. |
| Participant requests judge score endpoint | 403; anonymous gets 401. |
| Judge changes event/stage/track/project/assignment ID | No access outside authorized scope. |
| Track A judge accesses private Track B details/export | Denied. |
| Public project detail, RSC payload or cached page | Contains no private ballots, offsets or comments. |
| Final review submitted twice concurrently | One immutable final review; retry policy is deterministic. |
| Judge tries to edit final review | 409; original values/timestamp unchanged. |
| Review arrives at/after judging close | Rejected by server even if form was opened earlier. |
| Submission closed, judging open | Valid judge review allowed; participant submission/edit remains blocked. |
| WLS toy A=80/60, B=60/40 | Biases +10/-10, project means 70/50. |
| Two disconnected judge groups | Unsupported shared calibration; no false global ranking. |
| Missing review | Not converted to zero and not included in denominator. |
| 80 and 60 with target R=3 in explicit historical analysis | Mean70 with m=2, not46.6667; new stage with target3 remains incomplete. |
| One review | SD null; no divide-by-zero. |
| Raw normalized means101 and100.5 | Both may display100;101 ranks above100.5. |
| Constant-score judge | Finite handling and sample-aware diagnostic; no automatic deletion. |
| Evidence changed after calculation | Prior result marked stale or new calculation required. |
| Dropout after one submitted review | Submitted review preserved; only unfinished assignments repaired. |
| Impossible dropout repair under strict policy | Explicit failure; no silent lowering of R/parity constraints. |
| Progress before any judge begins | All assigned judges visible as not started. |
| Progress after draft versus submit | Draft changes status but not submitted completion count. |
| CSV title/comment contains comma, quote, newline, formula prefix | Valid parsed rows, safely handled user text, no field shifts. |
| Judge requests organizer CSV | Denied; no alternative export route leaks data. |
| Finalize incomplete stage | Blocked unless an implemented explicit predeclared exception exists. Core policy has no implicit exception. |
| Publish before finalization | Blocked. |
| Public result after publication | Only approved fields; peer ballots remain private. |
| Fixture migration and reseed | 41 projects,126 reviews, original IDs/date preserved; no duplication. |
| Two identical fresh offline startups on separate test volumes | Both seed correctly; restart does not duplicate/erase live work. |
| Pairwise balanced outcomes | Symmetric strengths to solver tolerance. |
| Pairwise all wins for one entry | Finite regularized fit, no overflow; uncertainty caveats retained. |
| Pairwise disconnected completed graph | Unsupported global model even if solver returns finite numbers. |
| Pairwise covariance example | Difference SE≈.374165739. |
| Pairwise no remaining budget, unstable boundary | Explicit uncertain stop, no false confidence claim. |
| Later stage receives advancing project | New assignments/evidence; old score not reused as a new review. |
| Separate track pairwise graphs with same human judge | No automatic global theta comparison. |

For assignment scale, measure modest deterministic cases first (e.g. 10/5, 40/30,100/30 submissions/judges with feasible R and eligibility). Attempt500/50 only after core correctness and if time permits. Record actual runtime and memory; a greedy local search is bounded but does not certify global optimum. Avoid exhaustive enumeration of assignment combinations.

## 12. Your local database and offline setup

You do not need a cloud PostgreSQL account. PostgreSQL can run as the existing Compose database service and store its data in a local Docker volume. Prisma is the application's interface to that database; migrations are versioned changes to its tables.

If T1 already uses local PostgreSQL successfully, **keep it**. Do not create a second database just because T2 starts. Antigravity should add migrations to the existing history. For a host-run Next.js development server, the database host is usually `localhost` and the mapped port. For Next.js inside Compose, it is the database service name on the container network. Use the actual names from your project.

What you need installed or available:

1. The project's pinned Node/package-manager environment, or its existing development container.
2. Docker Engine/Desktop with Compose working.
3. The project's local PostgreSQL service and a backup before migration.
4. Python to run the official checker, or a bundled local checker container if that is how your project supports it.
5. The downloaded fixture/checker, lockfile and all dependencies needed to build images while Internet is available.

**Do not** run `prisma migrate reset`, delete the volume, replace migrations with `db push`, or switch database providers to solve a migration conflict. Have Antigravity diagnose it on a disposable database first. A new optional demo event belongs beside the official fixture event, not instead of it.

### Offline is two separate questions

- **Runtime:** once images are present, `docker compose up` must start the application and PostgreSQL, migrate/seed, and support all required workflows without Internet.
- **Provisioning:** a completely fresh offline laptop cannot download missing Docker images, npm packages, Prisma engines or browser binaries. Provide/preload those artifacts before disconnection, or distribute an offline image bundle through the permitted submission channel.

Prepare the app image and PostgreSQL image while online. A `docker save` bundle can transport the required images; `docker load` installs them on the evaluator machine before the offline run. Antigravity must generate commands with your actual pinned image names/tags and target architecture. Document any preload step and the exact tested conditions. If organizers expect a different delivery format, clarify that specific packaging expectation; do not pretend a Git checkout contains Docker images.

The Compose app startup must not run `npm install`, download fonts, fetch a remote database, retrieve Prisma binaries, require OAuth, send mandatory SMTP verification, or load required UI assets from a CDN. Build generated clients and include engines at image-build time. Keep uploads and DB data local/persistent. Optional remote demo/repository/video links may be shown as links; their unavailability must not break judging local submission content.

Test in a separate Compose project so the smoke test cannot erase your actual work. Disconnect external Internet while retaining localhost and internal Docker networking; `--network none` on the app would also cut it off from PostgreSQL and is not a valid test of normal two-container operation.

## 13. Documentation and demo to submit

The official deliverables include the public licensed repository, one-command seeded portal, `.dogfood.toml`, actual acceptance output, README, ARCHITECTURE, DATA-MODEL, JUDGING and a five-minute lifecycle demo. Additional internal planning files are useful but do not substitute for implemented behavior.

| File | What this T2 release should say |
|---|---|
| README.md | What works; startup; local demo identities; route to organizer/judge views; offline provisioning; actual tier/bonus claims; known limits. |
| ARCHITECTURE.md | Next.js server boundary, auth/authorization, local DB/storage, calculations, transactions, private versus public result paths. |
| DATA-MODEL.md | Stage-aware schema, constraints, historical import provenance, duplicate policy, migrations, persistent volumes, import/export formats. |
| JUDGING.md | Actual assignment policy, rubric formula, WLS constraints/limits, incomplete-data policy, ranking/ties, isolation, implemented optional BT details, reproducibility. |
| acceptance-report.txt | Unedited stdout of the supplied runner against this release. |
| .dogfood.toml | Real local routes and seeded role credentials; honest tier claim. |
| LICENSE | The chosen OSI-approved license; preserve dependency license obligations. |
| docs/T2-DECISIONS.md | Changes from the team's proposal, rationale, policy and algorithm versions. |
| docs/T2-STATUS.md | Completed gates, actual test commands/results, remaining defects; avoid pasting private tokens. |
| docs/OFFLINE.md, if useful | Image provisioning, platform architecture, one-command runtime and actual disconnected test conditions. |
| docs/NORMALIZATION-PROOF.md, if implemented | Assumptions, fixture outputs, synthetic evidence, failure cases and limitations. |
| Demo link/file | One coherent event lifecycle, not a tour of unfinished settings. |

Suggested five-minute demonstration:

- 0:00–0:40: seeded local portal, fixture gallery and event date; briefly show one-command startup evidence.
- 0:40–1:20: event/team/project submission and enforced close; use the separate demo event for writable actions.
- 1:20–2:10: organizer selects judges/tracks, configures weighted rubric, previews assignments.
- 2:10–3:00: judge completes a review; show a genuine denied peer-score request.
- 3:00–4:00: organizer sees progress, closes/calculates, inspects raw/normalized results and exports CSV.
- 4:00–4:40: finalize/publish sanitized results; explain an honest limitation.
- 4:40–5:00: actual acceptance report and documentation. If pairwise is complete, replace part of the tour with a brief working example rather than lengthening the video.

## 14. If Antigravity gets stuck

Use this repair prompt instead of asking it to regenerate the app:

```text
Stop adding features. Diagnose the first failing gate in docs/T2-STATUS.md.
Reproduce it with the smallest meaningful test or direct request. Explain the cause
using actual code paths, then apply the smallest compatible fix. Preserve T1 data,
existing migrations, permissions and raw judging evidence. Do not delete tests,
relax mathematical invariants, fabricate expected outputs or edit official run.py.
Rerun the failing test plus relevant regression checks, report exact outcomes and
update status. If blocked by missing information, identify that fact precisely.
```

If the chat becomes too long again, ask it to update the handoff/status with actual code paths, decisions and tests, checkpoint the repository, and continue in another chat with those files. The repository and verified documentation are the durable project memory.

## 15. Final recommendation

Begin with the old-chat handoff prompt. Then start the new T2 chat and run C0. Keep PostgreSQL local and preserve your working T1 application. Deliver rubric judging, server isolation, WLS, progress, CSV and offline verification as one complete milestone. Implement your team's pairwise innovation next using the corrected covariance, explicit policies and separate evidence lifecycle.

A complete, explainable judging workflow is a stronger submission than a large configuration engine whose important paths have never been exercised.

### Statistical background for the optional engine

The formulas and corrections above are explicit design derivations for this plan. For deeper review of Bradley–Terry estimation and dependent comparison data, useful primary research includes:

- Butler & Whelan, [The existence of maximum likelihood estimates in the Bradley-Terry model and its extensions](https://arxiv.org/abs/math/0412232).
- Cattelan, [Models for Paired Comparison Data: A Review with Emphasis on Dependent Data](https://arxiv.org/abs/1210.1016).
- Wu, Junker & Niezink, [Asymptotic comparison of identifying constraints for Bradley-Terry models](https://arxiv.org/abs/2205.04341).

These sources do not validate the team's particular adaptive priority formula or establish that its stopping rule has a guaranteed error rate. Those remain policies requiring separate empirical/statistical validation.
