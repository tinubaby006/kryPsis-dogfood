# DOGFOOD HACKATHON

# Tier 2 — Judging System Implementation Plan

**Prepared:** 28 September 2026

**Target:** Complete Tier 2 judging implementation as an extension of the existing Tier 1 application.

---

# 1. PURPOSE

Tier 2 is an extension of the existing DOGFOOD application.

The implementation must result in:

```text
EXISTING TIER 1

        +

JUDGE MANAGEMENT

        +

STAGE CONFIGURATION

        +

ASSIGNMENT

        +

JUDGE REVIEWS

        +

METHOD-SPECIFIC SCORING

        +

CALIBRATION / NORMALIZATION

        +

RANKING

        +

TRACK ISOLATION

        +

OVERALL JUDGING

        +

PROGRESS

        +

EXPORT

        +

FINALIZATION / AUDIT

        =

ONE COHERENT DOGFOOD PLATFORM
```

The implementation must extend existing users, event memberships, tracks, teams, submissions, authentication, authorization, database, API conventions, frontend, migrations, fixtures, Docker environment, and tests.

No parallel implementation of concepts that already exist in Tier 1 should be introduced.

---

# 2. AUTHORITATIVE REQUIREMENTS

The implementation has four primary sources of truth.

## 2.1 Existing repository

The existing codebase determines:

* existing entities;
* existing relationships;
* existing authentication;
* existing role model;
* existing event model;
* existing track model;
* existing submission model;
* existing API conventions;
* existing frontend conventions;
* existing migration strategy;
* existing Docker/runtime setup.

Existing working behavior must be preserved.

## 2.2 `JUDGING.md`

`JUDGING.md` is authoritative for judging mathematics and judging behavior.

In particular, it defines:

* stage feasibility;
* assignment invariants;
* exact review counts;
* workload parity;
* overlap optimization;
* pairwise assignment;
* Bradley–Terry scoring;
* protected pairwise exploration;
* pairwise advancement;
* rubric scoring;
* WLS normalization;
* disagreement metrics;
* Type 2 track isolation;
* track ranking;
* overall calibration;
* overall candidate selection;
* fresh overall judging;
* multiple stages;
* extreme judge behavior;
* unlucky pairings;
* judge dropout;
* deterministic tie resolution;
* finalization snapshots;
* auditability.

The implementation must not replace these rules with a simpler `average(scores)` implementation.

For PAIRWISE specifically, the implementation must preserve the distinction between:

```text
INITIAL / COLD-START PAIR GENERATION
```

and:

```text
ADAPTIVE PAIR SELECTION
```

The initial pair set must be generated without relying on an early Bradley–Terry ranking because no pairwise evidence exists yet.

Bradley–Terry becomes an input to adaptive pair selection only after sufficient initial evidence has been collected.

## 2.3 DOGFOOD platform requirements

The public DOGFOOD specification requires T2 to provide judge invitation/assignment, weighted configurable rubric scoring, backend-enforced judge isolation, organizer progress visibility, cross-judge normalization, and CSV export.

The platform must also remain runnable locally with no hosted service dependency.

## 2.4 Existing fixtures and acceptance suite

`fixtures.json` is historical input data and must not be treated as newly generated stage evidence.

The existing fixture reviews must not be silently counted toward the configured review/comparison requirements for a newly created judging stage.

The acceptance runner already expects, at minimum:

```text
T2 judge sees own scores

T2 judge cannot see peer scores

T2 participant blocked

T2 CSV export works
```

These are baseline acceptance requirements, not the complete judging implementation.

---

# 3. IMPLEMENTATION PRINCIPLE

The system must be implemented as:

```text
ONE JUDGING ENGINE

        │

        ├── stage configuration
        ├── assignment domain
        ├── method
        ├── input population
        ├── eligible judges
        ├── required evidence
        └── advancement/output
```

There must not be separate hard-coded judging engines for:

* Type 1;
* Type 2;
* tracks;
* overall judging.

Instead:

```text
Reusable Assignment Engine
        +
Method-Specific Assignment Strategy
        +
Method-Specific Calculation Engine
        +
Scope / Eligibility Constraints
```

The important architectural distinction is:

```text
COMMON ASSIGNMENT ENGINE
    = infrastructure and constraint enforcement

RUBRIC ASSIGNMENT STRATEGY
    = submission → judge assignments

PAIRWISE ASSIGNMENT STRATEGY
    = comparison pair → judge assignments

PAIRWISE INITIAL STRATEGY
    = deterministic randomized cold-start coverage

PAIRWISE ADAPTIVE STRATEGY
    = Bradley–Terry-informed evidence gathering
```

Therefore, the implementation must **not** interpret "shared assignment engine" as "the exact same assignment function produces the same type of assignment for every method."

The common engine is reused for:

* feasibility;
* eligibility;
* capacity;
* deterministic construction support;
* workload handling;
* validation;
* repair;
* assignment isolation;
* stage isolation;
* auditability.

The method-specific strategy determines what the assignment unit actually is.

For RUBRIC:

```text
submission × judge
```

For PAIRWISE:

```text
comparison pair × judge
```

`PAIRWISE` and `RUBRIC` are methods of a judging stage. They are not fixed phases.

Valid pipelines include:

```text
Stage 1 → PAIRWISE

Stage 2 → PAIRWISE

Stage 3 → RUBRIC
```

```text
Stage 1 → RUBRIC

Stage 2 → RUBRIC
```

```text
Stage 1 → PAIRWISE

Stage 2 → RUBRIC

Stage 3 → PAIRWISE
```

The implementation must never assume:

```text
Phase 1 = Pairwise
Phase 2 = Rubric
```

or any other implicit ordering.

---

# 4. END-TO-END JUDGING LIFECYCLE

The implemented lifecycle should be:

```text
EVENT

 │

 ▼

JUDGE MANAGEMENT

 │

 ▼

JUDGING CONFIGURATION

 │

 ▼

STAGE CREATION

 │

 ▼

FEASIBILITY VALIDATION

 │

 ▼

ASSIGNMENT GENERATION

 │

 ▼

ASSIGNMENT VALIDATION

 │

 ▼

STAGE OPEN

 │

 ├───────────────┐
 ▼               ▼
JUDGE A          JUDGE B ...

 │               │
 ▼               ▼

INDEPENDENT REVIEWS / COMPARISONS

 │

 ▼

STAGE CLOSE

 │

 ▼

METHOD-SPECIFIC CALCULATION

 │

 ├── PAIRWISE → Bradley–Terry
 │
 └── RUBRIC   → Raw score → WLS calibration

 │

 ▼

STAGE RESULT

 │

 ▼

CONFIGURED ADVANCEMENT

 │

 ├── next stage
 ├── shortlist
 ├── track winners
 └── overall candidate pool

 │

 ▼

FINAL RANKING

 │

 ▼

FINALIZATION

 │

 ▼

IMMUTABLE RESULT + AUDIT SNAPSHOT
```

For a PAIRWISE stage with adaptive judging, the lifecycle is specifically:

```text
SUBMISSIONS
    │
    ▼
DETERMINISTIC RANDOMIZATION
    │
    ▼
INITIAL PAIR GENERATION
    │
    ▼
COMMON ASSIGNMENT ENGINE
    │
    ▼
INITIAL HUMAN COMPARISONS
    │
    ▼
BRADLEY–TERRY FIT
    │
    ▼
ADAPTIVE PAIR SELECTION
    │
    ▼
COMMON ASSIGNMENT ENGINE
    │
    ▼
ADDITIONAL HUMAN COMPARISONS
    │
    ▼
BRADLEY–TERRY REFIT
    │
    ▼
BOUNDARY / UNCERTAINTY / CONNECTIVITY CHECK
    │
    ├── continue adaptive judging
    │
    └── stop when configured stopping condition is met
    │
    ▼
PAIRWISE RESULT
    │
    ▼
CONFIGURED ADVANCEMENT
```

The critical ordering is:

```text
randomize
→ initial coverage
→ human evidence
→ Bradley–Terry
→ adaptive selection
→ more evidence
→ Bradley–Terry refit
→ repeat
```

It must **not** be:

```text
submissions
→ Bradley–Terry
→ initial ranking
→ choose first comparisons
```

because there is no valid Bradley–Terry evidence before the initial comparisons.

For Type 2:

```text
SUBMISSIONS

    │

    ▼

TRACK PARTITION

    │

    ├── Track A → independent judging
    ├── Track B → independent judging
    └── Track C → independent judging

                    │

                    ▼

             TRACK RANKLISTS

                    │

                    ▼

             GLOBAL EVIDENCE CHECK

              /              \

         SUPPORTED          NOT SUPPORTED

             │                   │

             ▼                   ▼

        GLOBAL WLS         CANDIDATE SELECTION

                                 │

                                 ▼

                         FRESH OVERALL PANEL

                                 │

                                 ▼

                         FRESH OVERALL JUDGING

                                 │

                                 ▼

                           OVERALL RESULTS
```

This flow follows the Type 2 decision model in `JUDGING.md`.

---

# 5. PHASE 1 — REPOSITORY AND T1 INTEGRATION AUDIT

Before changing the database or implementing judging, inspect the actual application.

Determine:

### Existing identity

* `User`;
* authentication/session model;
* event membership;
* event-scoped roles;
* organizer authorization;
* judge role.

Tier 1 already defines Judge as an event-scoped role, so judging must extend that model rather than introduce a separate `JudgeUser`.

### Existing event structure

Identify:

* Event;
* Track;
* Team;
* Project/Submission;
* event membership;
* event lifecycle;
* submission deadline.

### Existing infrastructure

Inspect:

* ORM;
* migrations;
* database;
* API routes;
* authorization middleware;
* frontend route structure;
* Docker;
* seed process;
* test infrastructure.

### Integration output

Produce an internal implementation map:

```text
Existing entity
    ↓
Existing table/model
    ↓
Existing authorization
    ↓
Existing API
    ↓
T2 extension required
```

Do not create a second entity when an existing equivalent can be extended.

---

# 6. PHASE 2 — JUDGING DOMAIN MODEL

Extend the database with the smallest domain model capable of representing the judging specification.

The logical model is:

```text
Event

 │

 ├── Judges / event memberships
 │
 ├── Tracks
 │
 └── JudgingConfiguration
        │
        ├── JudgingStages
        │      │
        │      ├── Method
        │      ├── Scope
        │      ├── Input population
        │      ├── Eligible judges
        │      ├── Required evidence
        │      ├── Advancement
        │      └── Configuration version
        │
        ├── JudgeTrackEligibility
        │
        └── OverallConfiguration
```

A stage then owns:

```text
Stage
 ├── assignments
 ├── reviews / comparison outcomes
 ├── rubric version
 ├── calculation
 ├── calibration
 ├── ranking
 ├── audit
 └── state
```

For PAIRWISE, the assignment/evidence domain must additionally represent:

```text
Pairwise Stage
 ├── comparison pairs
 ├── pair → judge assignments
 ├── comparison outcomes
 ├── assignment versions
 ├── initial/cold-start phase
 ├── adaptive phase
 ├── Bradley–Terry calculations
 ├── uncertainty / standard errors
 ├── boundary state
 └── stopping state
```

---

# 7. PHASE 3 — JUDGING STAGE STATE MACHINE

Implement an explicit server-side state machine:

```text
DRAFT
  ↓
CONFIGURED
  ↓
ASSIGNING
  ↓
OPEN
  ↓
CLOSED
  ↓
CALIBRATING / CALCULATING
  ↓
CALIBRATED
  ↓
FINALIZED
```

For an adaptive PAIRWISE stage, the internal calculation lifecycle may additionally track:

```text
INITIAL_ASSIGNMENT
    ↓
INITIAL_JUDGING
    ↓
INITIAL_MODEL_FIT
    ↓
ADAPTIVE_ASSIGNMENT
    ↓
ADAPTIVE_JUDGING
    ↓
MODEL_REFIT
    ↓
STOPPING_CHECK
```

These are judging-engine states/phases, not hard-coded competition stages.

## DRAFT

Organizer can configure:

* scope;
* method;
* judge panel;
* required evidence;
* rubric;
* track;
* input population;
* advancement;
* output.

## CONFIGURED

Server validates the complete configuration.

No assignment generation occurs until configuration is feasible.

## ASSIGNING

The system creates an assignment snapshot.

The assignment snapshot includes:

* stage;
* eligible judge pool;
* submission pool;
* required evidence configuration;
* algorithm version;
* deterministic seed;
* assignment version.

For PAIRWISE, the snapshot must also identify whether the generated assignments belong to:

```text
INITIAL
```

or:

```text
ADAPTIVE
```

scheduling.

## OPEN

Assignments and judging configuration are frozen for the active assignment version.

Judges can:

* view assigned submissions/comparisons;
* create drafts;
* submit final reviews/comparisons.

Judges cannot:

* change assignments;
* see peer reviews;
* see normalization internals;
* see aggregate results.

## CLOSED

No new reviews may be submitted.

The completed dataset is validated before calculation.

## CALIBRATING / CALCULATING

The system runs the appropriate method:

```text
PAIRWISE → Bradley–Terry calculation

RUBRIC   → WLS calibration
```

or the corresponding Type 2 calculation.

For PAIRWISE adaptive stages, calculation may occur repeatedly between assignment batches.

## CALIBRATED

The stage has a valid calculated result.

Raw evidence remains preserved.

## FINALIZED

The result and all relevant inputs become immutable.

State transitions must be:

* server-side;
* transactional;
* organizer/admin controlled;
* audited.

---

# 8. PHASE 4 — JUDGE MANAGEMENT

Extend the existing event-scoped Judge role.

Judge lifecycle:

```text
INVITED
   ↓
ACCEPTED
   ↓
ACTIVE
```

Additional operational statuses may include:

```text
SUSPENDED
REMOVED
```

A judge is still an existing platform `User` with an event-scoped judging relationship.

Implement:

* organizer judge invitation;
* invitation acceptance;
* activation;
* suspension/removal;
* judge panel membership;
* judge eligibility;
* judge-to-track eligibility.

A judge may be eligible for multiple tracks.

A judge must never be assigned to a track outside explicit organizer-configured eligibility.

---

# 9. PHASE 5 — STAGE CONFIGURATION

Organizer configuration must explicitly represent:

```text
Competition type

    TYPE_1_NO_TRACKS

    TYPE_2_MULTI_TRACK

Stage

    stage_id
    sequence
    method
    scope
    eligible judges
    required evidence
    input population
    advancement rule
    output rule
```

For Type 2 also represent:

```text
Track

    track_id
    eligible judges
```

Overall configuration may define:

```text
overall stage
overall judge pool
overall required evidence
candidate selection policy
overall method
```

For PAIRWISE, configuration must distinguish:

```text
Initial pairwise evidence configuration
Adaptive pairwise configuration
Stopping / advancement configuration
```

The logical configuration described in `JUDGING.md` must be preserved even if the physical database representation differs.

---

# 10. PHASE 6 — RUBRIC CONFIGURATION

For a `RUBRIC` stage:

```text
Rubric
 ├── version
 ├── criteria[]
 │    ├── criterion_id
 │    ├── name
 │    ├── weight
 │    └── max_score
 └── total weight
```

Validation:

```text
Σ wc = 1
```

All criteria must have valid maximum scores.

When the stage enters `OPEN`:

```text
RUBRIC VERSION = FROZEN
```

No mid-stage mutation is allowed.

---

# 11. PHASE 7 — COMMON ASSIGNMENT ENGINE

The assignment infrastructure is shared by:

* Type 1;
* Type 2 tracks;
* overall stages;
* RUBRIC stages;
* PAIRWISE stages.

However, the assignment **domain** is method-specific.

The common engine receives an assignment request and validates/enforces the common constraints.

Inputs:

```text
stage
submission pool
eligible judge pool
required evidence configuration
judge capacities
scope
track eligibility
method
configuration
deterministic seed
assignment strategy
```

The engine has six steps:

```text
1. Feasibility

2. Construction

3. Validation

4. Connectivity check

5. Deterministic repair

6. Final validation
```

The assignment strategy supplies the method-specific units.

For RUBRIC:

```text
submission × judge
```

For PAIRWISE:

```text
comparison pair × judge
```

The common engine must not itself invent Bradley–Terry pairs.

The PAIRWISE strategy generates comparison units first; the common engine then handles judge assignment and common constraints.

Assignment constraints are separated into:

### Hard constraints

Must never be violated:

* judge eligibility;
* track eligibility;
* required evidence count;
* distinct judge constraints where applicable;
* judge capacity;
* assignment isolation;
* stage isolation.

### Optimization objectives

Can be optimized only after hard constraints are satisfied:

* overlap balance;
* PairLoss;
* useful calibration connectivity;
* useful pairwise evidence coverage.

An optimization failure must never be "fixed" by violating a hard constraint.

---

# 12. PHASE 8 — STAGE FEASIBILITY

Feasibility is method-specific while using the same common validation infrastructure.

For RUBRIC:

```text
N = number of submissions

J = number of eligible judges

R = required reviews per submission

A = N × R
```

Validate:

```text
R <= J
```

unless the documented dropout exception applies.

Validate sufficient judge capacity.

Validate that every submission has enough eligible judges.

Validate track-specific pools independently.

Validate the requested assignment structure can satisfy the required overlap/connectivity conditions.

For PAIRWISE, do **not** incorrectly apply the rubric equation:

```text
A = N × R
```

as though every pairwise stage were simply a submission-to-judge assignment.

Instead, feasibility must validate the configured pairwise evidence requirements:

```text
submission population
eligible judge population
required comparison structure
judge capacities
pair uniqueness rules
coverage requirements
comparison graph requirements
track eligibility
adaptive budget, where configured
```

The pairwise system must be able to determine whether its initial comparison structure can be constructed before opening the stage.

If adaptive judging is configured, the system must also verify that the configured evidence/budget is sufficient for the intended adaptive process.

If infeasible:

```text
ASSIGNMENT_INFEASIBLE
```

The system must not:

* reduce required evidence silently;
* silently remove submissions;
* duplicate a judge where distinctness is required;
* ignore track eligibility;
* silently change method;
* silently create disconnected calibration groups;
* silently replace adaptive pairwise judging with static judging.

This is the fail-closed rule.

---

# 13. PHASE 9 — EXACT REVIEW / EVIDENCE COUNT

For RUBRIC:

For every submission `s`:

```text
assignedJudges(s) = R
```

and:

```text
|assignedJudges(s)| = R
```

with all judges distinct.

Database constraint:

```text
UNIQUE(stage_id, submission_id, judge_id)
```

The implementation must distinguish:

```text
assignment count
```

from:

```text
completed review count
```

A submission can have:

```text
3 assignments
1 completed review
```

during an open stage.

That does not mean it has satisfied its review requirement.

At normal stage completion:

```text
completed reviews = R
```

unless an explicitly recorded dropout-repair procedure applies.

For PAIRWISE, the equivalent invariant applies to **comparison evidence**, not blindly to the rubric assignment formula.

The system must distinguish:

```text
number of comparisons involving a submission
```

from:

```text
number of judges assigned to a comparison
```

and:

```text
number of completed comparison outcomes
```

A pairwise submission's evidence count is therefore derived from completed comparison outcomes according to the configured pairwise evidence model.

---

# 14. PHASE 10 — EXACT WORKLOAD BALANCING

For RUBRIC:

```text
A = N × R
J = active judges
```

calculate:

```text
q = floor(A / J)

e = A mod J
```

Exactly `e` judges receive:

```text
q + 1
```

assignments.

All others receive:

```text
q
```

Therefore:

```text
max(load) - min(load) <= 1
```

This is a hard assignment invariant where the configured assignment structure requires exact parity.

For PAIRWISE, workload is measured in **comparison assignments**, not submissions.

If the initial/adaptive batch contains:

```text
A_pair = number of comparison × judge assignment units
```

and:

```text
J = active eligible judges
```

the common assignment engine balances those comparison assignments according to the configured parity constraint.

The method-specific pair generator therefore does not assign judges directly. It creates comparison units; the common assignment engine distributes those units among eligible judges.

For adaptive batches, the system must preserve the applicable workload constraints while assigning newly selected comparisons.

If exact parity cannot coexist with mandatory constraints:

```text
ASSIGNMENT_INFEASIBLE
```

must be returned rather than producing an invalid assignment.

---

# 15. PHASE 11 — OVERLAP AND EVIDENCE OPTIMIZATION

For RUBRIC judges `i` and `j`:

```text
Oij = number of submissions reviewed by both judges
```

The theoretical average overlap is:

```text
P =

N × C(R,2)
----------------
C(J,2)
```

The optimization objective is:

```text
PairLoss =

Σ(i<j) (Oij - P)^2
```

The rubric assignment algorithm must:

1. satisfy exact review count;
2. satisfy distinctness;
3. satisfy workload parity;
4. satisfy eligibility;
5. preserve required connectivity;
6. then minimize PairLoss.

The algorithm is:

```text
deterministic greedy construction
            ↓
deterministic validation
            ↓
deterministic local improvement
            ↓
deterministic repair
            ↓
final invariant validation
```

Do not enumerate every possible assignment.

`R = 1` is a special case:

```text
no submission has judge overlap
```

so cross-judge overlap calibration cannot be generated by assignment.

For PAIRWISE, overlap is not defined merely as "judges who reviewed the same submission."

The evidence structure is instead the comparison graph:

```text
submission = vertex

comparison = edge

judge assignment = evidence ownership
```

The pairwise assignment strategy must optimize for useful comparison evidence, including:

* broad initial coverage;
* connected comparison graph;
* balanced evidence;
* no prohibited duplicate comparison assignment;
* useful adaptive evidence;
* boundary protection once a model exists.

The common assignment engine then optimizes judge distribution over those comparison units.

---

# 16. PHASE 12 — DETERMINISTIC ASSIGNMENT

The assignment output must be reproducible.

Given identical:

```text
event
stage
submission population
judge population
configuration
algorithm version
seed
```

the deterministic assignment process must produce the same result.

Stable ordering must be used for all tie-breaking.

No database-default ordering.

No unseeded randomness.

Persist:

```text
assignment_version

algorithm_version

assignment_seed
```

For PAIRWISE, deterministic randomization is part of the cold-start process.

The initial randomized submission ordering/pair generation must be derived from the persisted deterministic seed and stage configuration.

This randomization must occur **before** any Bradley–Terry model exists.

---

# 17. PHASE 13 — ASSIGNMENT REPAIR

If construction violates a repairable optimization objective:

```text
attempt local swap
```

A swap may only be accepted if:

* all hard constraints remain valid;
* workload parity remains valid where required;
* distinctness remains valid;
* eligibility remains valid;
* connectivity is not degraded below required support;
* objective improves or satisfies the defined deterministic acceptance rule.

Use a fixed safety ceiling.

Never allow an unbounded optimization loop.

For PAIRWISE, repair must not alter the semantic comparison strategy merely to satisfy judge distribution.

For example, the system must not:

```text
delete required comparison
duplicate comparison
remove judge eligibility
```

merely because those actions make workload balancing easier.

If repair cannot produce a valid assignment:

```text
ASSIGNMENT_INFEASIBLE
```

No partial invalid assignment may be committed.

---

# 18. PHASE 14 — PAIRWISE METHOD ARCHITECTURE

When:

```text
stage.method = PAIRWISE
```

the stage uses pairwise comparisons.

The pairwise system consists of four logically separate components:

```text
Pairwise Initial Strategy
        ↓
Common Assignment Engine
        ↓
Bradley–Terry Model Engine
        ↓
Pairwise Adaptive Strategy
        ↓
Common Assignment Engine
```

More explicitly:

```text
PAIRWISE STAGE

1. deterministic randomization

2. initial pair generation

3. initial judge assignment

4. initial human comparisons

5. Bradley–Terry fit

6. adaptive pair selection

7. adaptive judge assignment

8. additional human comparisons

9. Bradley–Terry refit

10. stopping / advancement check
```

The pairwise assignment unit is:

```text
comparison(A, B) × judge
```

not simply:

```text
submission × judge
```

The pairwise result is stage-local.

It produces:

```text
θs
```

for each submission represented in the fitted model.

`θ` is a relative-strength estimate.

It must never be treated as a rubric score.

---

# 19. PHASE 15 — PAIRWISE COLD-START RANDOMIZATION

Before Bradley–Terry can influence pair selection, the system must establish an initial evidence set.

The initial phase is:

```text
submission population
        ↓
deterministic randomization
        ↓
initial comparison generation
        ↓
coverage/connectivity validation
        ↓
judge assignment
```

The initial randomization must be:

* deterministic;
* seed-controlled;
* reproducible;
* independent of early model rankings;
* isolated to the stage/assignment version.

Persist:

```text
stage_id

assignment_version

assignment_seed

algorithm_version

initial randomized ordering
```

The initial randomized ordering must not be generated from:

```text
previous stage ranking
```

or:

```text
Bradley–Terry θ
```

because the new pairwise stage has not yet collected its own evidence.

The purpose of the initial phase is to create a broad, unbiased starting evidence graph.

The implementation must prioritize:

* broad submission coverage;
* comparison graph connectivity;
* valid pair construction;
* judge eligibility;
* judge workload;
* deterministic reproducibility.

The initial pair set is therefore a **cold-start evidence design**, not an early model-driven ranking operation.

---

# 20. PHASE 16 — INITIAL PAIR GENERATION

The initial pair strategy converts the randomized submission population into comparison units.

Conceptually:

```text
randomized submissions
        ↓
candidate comparison pairs
        ↓
coverage selection
        ↓
comparison graph
```

Each pair represents:

```text
(A, B)
```

where A and B are distinct submissions.

The initial pair generator must ensure the configured initial evidence requirements.

The initial comparison graph must satisfy the required connectivity condition before the stage opens.

The initial strategy must not use:

```text
θ
SE
pij
boundary distance
```

because those quantities do not yet exist from the new stage's evidence.

The output of the initial strategy is:

```text
InitialComparisonUnits
```

which are then passed to the common Assignment Engine.

---

# 21. PHASE 17 — INITIAL PAIR ASSIGNMENT TO JUDGES

The common Assignment Engine receives:

```text
initial comparison units

+

eligible judges

+

judge capacities

+

track eligibility

+

deterministic seed

+

assignment constraints
```

It then assigns:

```text
comparison(A,B) → judge J
```

subject to the common constraints.

The judge assignment must preserve:

* judge eligibility;
* track eligibility;
* judge capacity;
* workload balancing;
* assignment isolation;
* stage isolation;
* deterministic behavior.

The pair generator and judge allocator must remain separate.

The pair generator answers:

```text
Which comparisons should exist?
```

The common assignment engine answers:

```text
Which eligible judge receives each comparison?
```

This distinction is mandatory for the implementation.

---

# 22. PHASE 18 — INITIAL HUMAN EVIDENCE

Judges receive pairwise comparisons independently.

For each comparison:

```text
Submission A

VS

Submission B
```

the judge selects the configured winner.

The pairwise interface must not require:

* numeric scores;
* rubric criteria;
* confidence values;
* ties;

unless a future explicitly configured method adds such behavior.

The submitted outcome becomes immutable evidence.

For example:

```text
A beats B
```

is stored as a pairwise outcome.

The system must preserve:

```text
stage
assignment version
pair
judge
outcome
timestamp
algorithm/model version where applicable
```

Initial pairwise evidence is then passed to the Bradley–Terry model engine.

---

# 23. PHASE 19 — BRADLEY–TERRY CALCULATION

For submissions `i` and `j`:

```text
P(i beats j)

=

e^θi / (e^θi + e^θj)
```

equivalently:

```text
P(i beats j)

=

1 / (1 + e^-(θi-θj))
```

Estimate the stage strengths by maximizing:

```text
Σ observed outcomes log(P(i beats j))

-

λ Σ θ²
```

subject to:

```text
Σ θ = 0
```

with:

```text
λ = 0.1
```

The regularization prevents unbounded estimates for submissions with extreme observed outcomes.

Persist:

* raw pairwise outcomes;
* model parameters;
* `θ`;
* standard errors;
* model version;
* connectivity;
* calculation status.

The Bradley–Terry model is a **calculation/model engine**, not the assignment engine.

It only becomes an input to pair selection after the initial cold-start evidence exists.

---

# 24. PHASE 20 — PAIRWISE ADAPTIVE SELECTION

After the initial evidence has been collected and Bradley–Terry has been fitted, the system may enter adaptive scheduling.

The adaptive loop is:

```text
completed evidence
        ↓
Bradley–Terry fit
        ↓
candidate pair generation
        ↓
protected pair priority
        ↓
connectivity protection
        ↓
selected comparison units
        ↓
common assignment engine
        ↓
additional human evidence
        ↓
Bradley–Terry refit
```

Adaptive pair selection may use the protected exploration model defined in `JUDGING.md`.

For candidate pair `(i,j)`:

```text
Pij =

0.40 Sij

+ 0.30 Bij

+ 0.20 Iij

+ 0.10 Eij
```

where the model considers:

* boundary relevance;
* uncertainty;
* information value;
* evidence balancing.

The adaptive system must therefore not simply select:

```text
highest-ranked submission vs lowest-ranked submission
```

or repeatedly compare the same obvious pairs.

The purpose is to gather additional evidence where it can improve the reliability of the configured advancement decision.

---

# 25. PHASE 21 — PROTECTED PAIRWISE EXPLORATION

For shortlist boundary `K`, define:

```text
Si = max(0, θi + 1.96SEi - θK)
```

and:

```text
Sij = (Si + Sj) / 2
```

Boundary relevance is combined with the other protected exploration terms:

```text
Pij =

0.40 Sij

+ 0.30 Bij

+ 0.20 Iij

+ 0.10 Eij
```

The information term is:

```text
Iij = 4pij(1-pij)
```

where:

```text
pij = P(i beats j)
```

Evidence balancing is:

```text
Eij = 1 / (1 + Ci + Cj)
```

where `Ci` and `Cj` represent existing comparison evidence for the submissions.

Boundary terms and uncertainty must be computed from the current stage-local Bradley–Terry model.

Adaptive selection must never use information from another stage as though it were current evidence.

---

# 26. PHASE 22 — ADAPTIVE CONNECTIVITY PROTECTION

Connectivity has priority over ordinary adaptive pair ranking.

The comparison graph is:

```text
submission = vertex

comparison = edge
```

If adaptive selection would disconnect the graph:

```text
CONNECTIVITY PROTECTION
```

overrides the normal priority selection.

The system must never knowingly create:

```text
component A

+

component B
```

and then pretend that one global Bradley–Terry model is supported.

Therefore:

```text
adaptive priority
```

is subordinate to:

```text
required graph connectivity
```

---

# 27. PHASE 23 — PAIRWISE ADAPTIVE LOOP

The complete adaptive loop is:

```text
INITIAL EVIDENCE
       ↓
FIT BT
       ↓
CALCULATE θ / SE
       ↓
CHECK CONNECTIVITY
       ↓
CHECK BOUNDARY
       ↓
GENERATE CANDIDATE PAIRS
       ↓
CALCULATE PROTECTED PRIORITY
       ↓
SELECT PAIRS
       ↓
ASSIGN SELECTED PAIRS TO JUDGES
       ↓
COLLECT OUTCOMES
       ↓
REFIT BT
       ↓
REPEAT
```

Each adaptive assignment batch must receive its own assignment version.

For example:

```text
assignment_version = 1
    initial comparisons

assignment_version = 2
    adaptive comparisons batch 1

assignment_version = 3
    adaptive comparisons batch 2
```

Previously completed evidence is preserved.

Adaptive batches add evidence; they do not rewrite historical outcomes.

---

# 28. PHASE 24 — PAIRWISE ADVANCEMENT

Pairwise output does not automatically mean "shortlist".

The organizer configures advancement.

Supported logical outputs include:

```text
continue all

advance K

advance percentage

configured advancement rule
```

For exact `K`:

```text
ΔK = θK - θK+1
```

Stability condition:

```text
ΔK >

1.96 × sqrt(SEK² + SEK+1²)
```

If the boundary is not stable:

```text
continue adaptive judging
```

provided additional evidence is available and the configured budget permits it.

If the configured comparison budget ends before stability:

```text
SHORTLIST_BOUNDARY_UNCERTAIN
```

is recorded.

Fallback selection uses the model estimate plus deterministic SHA-256 tie resolution where the configured fallback requires deterministic resolution.

The system must never silently interpret an uncertain boundary as mathematically stable.

---

# 29. PHASE 25 — RUBRIC METHOD

When:

```text
stage.method = RUBRIC
```

each judge evaluates assigned submissions using the frozen rubric.

For submission `s`, judge `j`:

```text
r(s,j)

=

100 × Σc wc × score(s,j,c) / maxc
```

where:

```text
Σc wc = 1
```

and therefore:

```text
0 <= r(s,j) <= 100
```

Raw criterion values and raw judge scores are immutable.

---

# 30. PHASE 26 — WLS JUDGE CALIBRATION

Rubric normalization uses the additive judge-offset model:

```text
r(s,j) = θs + bj + εs,j
```

For judges `i,j`:

```text
ωij = number of shared submissions
```

and:

```text
d̄ij =

1/ωij ×

Σs∈Shared(i,j)

(r(s,i) - r(s,j))
```

Estimate judge offsets using:

```text
min_b

Σi<j

ωij [

    (bi - bj) - d̄ij

]²
```

subject to:

```text
Σj bj = 0
```

The overlap count is the WLS edge weight.

Every valid edge with:

```text
ωij >= 1
```

is usable evidence.

A judge pair with one shared submission must not automatically be discarded.

---

# 31. PHASE 27 — RUBRIC NORMALIZATION

For each review:

```text
n(s,j) = r(s,j) - bj
```

Aggregate without clamping:

```text
F_raw(s)

=

1/Rs × Σj n(s,j)
```

Only after aggregation:

```text
Fpublished(s)

=

min(100, max(0, F_raw(s)))
```

Ranking uses:

```text
F_raw
```

not the displayed clamped score.

Therefore:

```text
F_raw(A) = 101

F_raw(B) = 100.5
```

may both display as:

```text
100
```

while retaining their full-precision ranking order.

---

# 32. PHASE 28 — RUBRIC DISAGREEMENT

For submission `s`:

```text
SD_s =

sqrt(

    Σj (n(s,j) - F_raw(s))²

    /

    (Rs - 1)

)
```

High disagreement creates an audit signal.

It does not automatically reduce the score.

Persist:

```text
F_raw

F_published

SD

judge offsets

review count
```

as calculation evidence.

---

# 33. PHASE 29 — CALIBRATION CONNECTIVITY

Build the judge-overlap graph:

```text
judge = vertex

shared submission = edge

ωij = edge weight
```

For a calibration universe, determine:

```text
Is graph connected?
```

If the graph is disconnected:

```text
CALIBRATION_UNSUPPORTED
```

The system must not silently run independent component calibrations and pretend that they form one global calibration.

This is particularly important for Type 2.

The assignment engine therefore has two different responsibilities:

```text
Assignment:

    attempt to create useful connected overlap

Calibration:

    verify whether the completed evidence actually supports calibration
```

Assignment connectivity cannot simply be assumed from intended configuration.

---

# 34. PHASE 30 — TYPE 1: NO TRACKS

Type 1 means:

```text
one global submission pool

one judging universe
```

There is no track partition.

For every configured stage:

```text
input population
    ↓
eligible judges
    ↓
feasibility
    ↓
method-specific assignment strategy
    ↓
common assignment engine
    ↓
judging
    ↓
method calculation
    ↓
calibration if applicable
    ↓
ranking
    ↓
configured advancement
```

For PAIRWISE specifically:

```text
input population
    ↓
deterministic randomization
    ↓
initial pair generation
    ↓
common assignment
    ↓
initial comparisons
    ↓
Bradley–Terry
    ↓
adaptive pair generation
    ↓
common assignment
    ↓
additional comparisons
    ↓
Bradley–Terry refit
    ↓
advancement
```

Type 1 can therefore support:

```text
PAIRWISE

PAIRWISE → RUBRIC

RUBRIC → RUBRIC

PAIRWISE → RUBRIC → PAIRWISE
```

and other valid configured sequences.

The result of a stage must not automatically become the numeric score of the next stage.

Only the explicitly configured advancement data crosses the stage boundary.

---

# 35. PHASE 31 — STAGE ISOLATION

Every stage owns its own:

```text
assignments

reviews / comparison outcomes

raw evidence

calculation

calibration

ranking
```

For pairwise:

```text
θ(s)
```

belongs only to that stage.

For rubric:

```text
F_raw(s)
```

belongs only to that stage.

A later stage may receive:

```text
submission IDs
```

or other explicitly configured advancement data.

It must not silently receive:

```text
previous stage score
```

as its new judging score.

---

# 36. PHASE 32 — TYPE 2 TRACK MODEL

Type 2 means:

```text
submissions are partitioned by track
```

Each track is initially an independent judging universe.

Example:

```text
Track A

    submissions A1...An

    eligible judges A

Track B

    submissions B1...Bn

    eligible judges B

Track C

    submissions C1...Cn

    eligible judges C
```

Track eligibility is organizer-controlled.

A judge may belong to:

```text
A

C
```

without belonging to:

```text
B
```

The assignment engine cannot invent eligibility.

---

# 37. PHASE 33 — TRACK ASSIGNMENT

Use the same reusable assignment infrastructure.

The assignment domain changes to:

```text
Track submissions

        ×

Track-eligible judges
```

For RUBRIC:

```text
submission × judge
```

For PAIRWISE:

```text
comparison pair × judge
```

For each track, independently enforce the applicable:

```text
exact evidence requirement

distinctness

workload parity

overlap/evidence optimization

connectivity
```

For pairwise tracks, the process remains:

```text
track submissions
    ↓
deterministic randomization
    ↓
initial pair generation
    ↓
track-eligible judge assignment
    ↓
initial evidence
    ↓
Bradley–Terry
    ↓
adaptive track pair selection
```

The track assignment objective remains governed by the same common assignment mathematics where applicable.

Cross-track balancing is not allowed to violate track eligibility.

---

# 38. PHASE 34 — TRACK ISOLATION

A Track A judge must not see:

* Track B assignments;
* Track B reviews;
* Track B normalized scores;
* Track B rankings;
* Track B calibration internals.

The backend must enforce:

```text
authenticated user

+

event

+

stage

+

assignment

+

track
```

as authorization context.

Frontend hiding is insufficient.

The DOGFOOD acceptance requirement explicitly checks backend judge isolation.

---

# 39. PHASE 35 — TRACK CALIBRATION

Each track is calibrated independently.

For a rubric track:

```text
track submissions
        ↓
track raw reviews
        ↓
track overlap graph
        ↓
track WLS calibration
        ↓
track normalized scores
        ↓
track ranklist
```

For a pairwise track:

```text
track comparisons
        ↓
track comparison graph
        ↓
track Bradley–Terry model
        ↓
track θ / uncertainty
        ↓
track advancement/ranklist
```

No track may borrow another track's judge offsets.

No track may borrow another track's ranking.

No track-normalized score may be treated as globally comparable merely because all tracks use a `0–100` display scale.

---

# 40. PHASE 36 — TRACK RANKING

Each track receives an independent ranklist.

For rubric ranking, use full-precision internal scores.

If:

```text
F_raw(A) = F_raw(B)
```

use:

```text
SHA256(

    canonicalEncode(

        competitionId,

        judgingVersion,

        submissionId

    )

)
```

as the deterministic tie key.

The tie key is ordered lexicographically.

For pairwise ranking, equivalent full-precision model ordering and deterministic tie handling must be used.

No database order or random ordering may determine final ties.

---

# 41. PHASE 37 — TRACK WINNERS

If configured:

```text
result = TRACK_WINNERS
```

publish one or more winners according to the organizer's configured output.

The track result is based only on that track's judging universe.

Do not use:

```text
track size
```

as a quality signal.

Do not compare normalized scores from separate tracks to determine track winners.

---

# 42. PHASE 38 — TYPE 2 OVERALL DECISION

This is a critical part of the implementation.

The system must NOT simply ask:

```text
Organizer:

"Should global calibration be enabled?"
```

The completed judging evidence determines whether global calibration is mathematically supportable.

After track judging:

```text
Completed track evidence

        ↓

Build global judge-overlap graph

        ↓

Check connectivity

        ↓

Check evidence sufficiency
```

Then:

```text
             SUPPORTED?

             /        \

           YES         NO

            │           │

            ▼           ▼

       Global WLS    Track ranklists

            │             │

            ▼             ▼

       Global ranking  Candidate selection

                             │

                             ▼

                       Fresh overall panel

                             │

                             ▼

                       Fresh judging

                             │

                             ▼

                       Overall results
```

This decision is based on actual completed evidence.

Configuration determines what overall behavior is allowed/expected; it does not override mathematical feasibility.

`JUDGING.md` explicitly defines this data-driven decision model.

---

# 43. PHASE 39 — GLOBAL CALIBRATION WHEN SUPPORTED

When the completed evidence supports a connected global calibration:

Do NOT simply compare:

```text
Track A F_raw

Track B F_raw

Track C F_raw
```

Instead recompute one global calibration from the relevant raw evidence.

Use:

```text
min_b

Σi<j

ωij [

    (bi-bj)-d̄ij

]²
```

subject to:

```text
Σj bj = 0
```

Then:

```text
n(s,j) = r(s,j) - bj
```

and:

```text
F_global_raw(s)

=

1/Rs × Σj n(s,j)
```

Global ranking uses the full-precision global result.

Track calibration and global calibration are separate calculations.

```text
TRACK CALIBRATION ≠ GLOBAL CALIBRATION
```

The global audit must record:

* participating judges;
* submissions;
* overlap graph;
* connectivity;
* feasibility;
* WLS solution;
* algorithm version;
* global scores;
* ranking;
* snapshot/hash.

---

# 44. PHASE 40 — GLOBAL CALIBRATION WHEN NOT SUPPORTED

If global calibration is not supported:

```text
DO NOT:

Track A score → compare with Track B score
```

Instead:

```text
Track ranklists
      ↓
candidate selection policy
      ↓
overall candidate pool
      ↓
new overall panel
      ↓
fresh judging
```

Track scores are used only to determine who enters the overall stage.

They are not reused as overall scores.

This distinction is mandatory:

```text
Track scores select candidates.

Fresh overall judging determines
overall scores.
```

---

# 45. PHASE 41 — OVERALL CANDIDATE SELECTION

The candidate selection policy must be explicit.

Examples:

```text
Top K from every track
```

or:

```text
configured percentage from every track
```

or another deterministic organizer-defined policy.

The system must not silently use:

```text
track population size
```

as a quality signal.

Candidate selection must be recorded in the overall audit.

---

# 46. PHASE 42 — FRESH OVERALL JUDGING

The overall stage is a real new stage.

It receives:

```text
candidate submissions

+

overall eligible judges

+

overall evidence requirement

+

overall method
```

Then it runs:

```text
feasibility
→ method-specific assignment
→ judging
→ method-specific calculation
→ calibration
→ ranking
```

For PAIRWISE overall judging:

```text
candidate pool
    ↓
deterministic randomization
    ↓
initial pair generation
    ↓
judge assignment
    ↓
initial comparisons
    ↓
Bradley–Terry
    ↓
adaptive comparisons
    ↓
Bradley–Terry refit
    ↓
overall ranking
```

The previous track score is not the overall score.

The overall panel may use:

```text
RUBRIC
```

or:

```text
PAIRWISE
```

according to organizer configuration.

---

# 47. PHASE 43 — MULTIPLE JUDGING STAGES

Support arbitrary configured stage sequences.

Example:

```text
Stage 1

PAIRWISE

all submissions

↓

advance top 20

Stage 2

RUBRIC

20 submissions

↓

advance top 5

Stage 3

RUBRIC

5 submissions

↓

final results
```

Another valid pipeline:

```text
Stage 1

RUBRIC

all submissions

Stage 2

RUBRIC

all submissions
```

Another:

```text
Stage 1

PAIRWISE

Stage 2

RUBRIC

Stage 3

PAIRWISE
```

Every stage must independently own:

* configuration;
* assignment;
* evidence;
* calculation;
* output.

No hidden method transitions.

---

# 48. PHASE 44 — EXTREME JUDGE BEHAVIOR

The system must preserve evidence from judges whose scoring behavior is extreme.

Examples:

```text
judge gives almost everything 100

judge gives almost everything 0

judge gives nearly identical scores

judge has very high disagreement
```

These conditions should produce audit signals and/or calibration effects defined by the mathematical model.

They must not cause arbitrary manual score deletion.

The fixture data deliberately contains uneven/historical judging behavior, so the implementation must not assume clean synthetic scoring.

---

# 49. PHASE 45 — UNLUCKY PAIRINGS

Pairwise systems must account for the possibility that submissions receive an insufficiently representative set of comparisons.

The pairwise assignment and scheduling system therefore uses two layers of protection.

Initial phase:

```text
deterministic randomization

+

broad coverage

+

graph connectivity
```

Adaptive phase:

```text
boundary protection

+

uncertainty

+

information value

+

evidence balancing

+

connectivity protection
```

A single unlucky comparison must not automatically determine advancement where the configured pairwise mechanism can gather additional evidence.

The adaptive phase exists specifically so the system can spend additional comparison budget where the current evidence is insufficient for a reliable configured decision.

---

# 50. PHASE 46 — TRACK SELECTION RISK

Track-based selection must explicitly avoid:

```text
"Track A has a higher average, therefore Track A is better."
```

Track population is not a quality signal.

Track-normalized scores are not globally comparable unless a valid global calibration/comparison mechanism exists.

If global evidence is unsupported:

```text
track rankings

    ↓

balanced candidate selection

    ↓

fresh overall judging
```

---

# 51. PHASE 47 — JUDGE DROPOUT

Judge dropout is an operational state change.

When a judge leaves after assignments have been created:

```text
DO NOT

delete their completed reviews/comparisons
```

Preserve all completed valid evidence.

Determine outstanding assignments.

Create a new assignment version.

Reassign only the outstanding workload where possible.

Validate again:

```text
required evidence count

distinct judges where applicable

eligibility

workload constraints

connectivity
```

For PAIRWISE, completed comparison outcomes remain valid evidence.

Outstanding comparison assignments are reassigned according to the remaining eligible judge pool.

Record:

```text
old assignment version

new assignment version

dropped judge

completed evidence preserved

reassigned comparisons/submissions

new assignments

reason

timestamp

actor
```

No silent mutation of an active assignment snapshot.

---

# 52. PHASE 48 — REVIEW WORKFLOW

Judge review lifecycle:

```text
ASSIGNED
   ↓
DRAFT
   ↓
SUBMITTED
```

Draft reviews may be edited by their owner.

Submitted reviews/comparison outcomes are immutable.

Judge authorization must validate:

```text
current user

+

event

+

stage

+

assignment

+

submission
```

A judge may only submit evidence for a submission/comparison explicitly assigned to them.

A judge cannot submit evidence for:

* another judge's assignment;
* another stage;
* another event;
* another track.

---

# 53. PHASE 49 — JUDGE ISOLATION

The backend must enforce:

```text
Judge A

    ↓

only Judge A's assignments

only Judge A's own drafts

only Judge A's submitted reviews
```

Judge A must not access:

```text
Judge B reviews

Judge B scores

aggregate scores

normalization offsets

overlap matrices

rankings

calibration internals
```

For PAIRWISE, a judge must also not access:

```text
other judges' comparison outcomes

current Bradley–Terry θ

adaptive priority scores

boundary uncertainty

aggregate pairwise ranking
```

unless explicitly authorized by organizer/admin permissions.

Organizers/admins may access aggregate and audit data according to their authorization.

This must be tested through direct API requests, not merely through UI navigation.

DOGFOOD explicitly states that if a judge can access another judge's scores through a direct request, T2 isolation is not satisfied.

---

# 54. PHASE 50 — ORGANIZER PROGRESS DASHBOARD

Progress is derived from authoritative assignment/review records.

For each stage:

```text
Assigned

Completed

Remaining
```

At judge level:

```text
Judge

Assigned

Completed

Remaining
```

At submission level:

```text
Submission

Required evidence

Completed

Remaining
```

For PAIRWISE, progress must distinguish:

```text
initial comparisons assigned

initial comparisons completed

adaptive comparisons assigned

adaptive comparisons completed

total comparisons completed
```

Do not calculate progress from frontend state.

Do not infer completion from page visits.

Use:

```text
Assignment records

+

Submitted review/comparison records
```

as the source of truth.

---

# 55. PHASE 51 — CSV EXPORT

Implement authorized exports for:

```text
Assignments

Raw Reviews

Normalization

Final Results
```

For pairwise stages, exports must additionally preserve pairwise evidence:

```text
comparison pair

judge

outcome

assignment version

model/calculation metadata where applicable
```

Exports must have deterministic ordering.

Example ordering:

```text
event_id

stage_sequence

stage_id

track_id

submission_id

judge_id
```

depending on export type.

Organizer/admin authorization must be enforced server-side.

Judge users must not receive organizer exports.

The T2 acceptance suite must continue to pass:

```text
organizer → CSV = 200
```

with valid CSV output.

---

# 56. PHASE 52 — AUDIT TRAIL

Create append-only audit events for important judging operations.

At minimum:

```text
judge_invited

judge_accepted

judge_activated

judge_suspended

stage_created

stage_configured

stage_opened

assignment_generated

assignment_repaired

assignment_version_created

pairwise_initial_generated

pairwise_model_fitted

pairwise_adaptive_batch_generated

pairwise_stopping_checked

judge_dropped

review_submitted

comparison_submitted

stage_closed

calibration_started

calibration_failed

calibration_completed

ranking_generated

finalization_started

finalized
```

Each event should capture enough information to answer:

```text
WHO

WHAT

WHEN

WHICH EVENT

WHICH STAGE

WHICH VERSION

WHY / RESULT
```

For pairwise model events, record enough metadata to reproduce or audit:

```text
model version

input evidence scope

assignment version

θ/model state

boundary state

stopping result
```

---

# 57. PHASE 53 — FINALIZATION

Finalization may occur only after:

```text
all required reviews/comparisons satisfied

OR

documented dropout exception satisfied
```

and:

```text
assignment invariants valid

method calculation valid

calibration valid/supportably failed-over

ranking valid
```

Finalization creates an immutable snapshot.

The snapshot must include:

```text
competition

competition type

algorithm version

assignment seed

organizer configuration

judge count

review/comparison count

stage count

stage methods

advancement rules

track configuration

judge-track eligibility

overall configuration

result configuration

feasibility result

stage audits

    input population

    judge panel

    assignments

    workload

    overlap/evidence structure

    connectivity

pairwise audits

    randomized initial ordering

    initial pairs

    raw outcomes

    assignment versions

    BT theta

    standard errors

    adaptive batches

    boundary stability

    stopping state

rubric audits

    raw criterion scores

    WLS offsets

    overlap matrix

    F_raw

    F_published

    disagreement

track audits

    track

    eligible judges

    assignments

    calibration

    ranklist

overall audit

    global calibration status

    candidate policy

    selected candidates

    overall panel

    assignments

    method

    calibration

    ranklist

snapshot hash
```

This mirrors the finalization record specified in `JUDGING.md`.

---

# 58. PHASE 54 — DETERMINISTIC FINAL TIE RESOLUTION

For exact full-precision equality:

```text
F_raw(A) = F_raw(B)
```

calculate:

```text
tieKey =

SHA256(

    canonicalEncode(

        competitionId,

        judgingVersion,

        submissionId

    )

)
```

Sort by the resulting byte sequence.

The same inputs must therefore always produce the same final order.

For pairwise, deterministic tie resolution applies to equal model estimates or equivalent configured final-order ties.

---

# 59. PHASE 55 — FIXTURE HANDLING

The existing fixture data must be preserved.

Historical fixture reviews are not automatically new-stage reviews.

When creating a new judging stage:

```text
new stage
    ↓
new assignment snapshot
    ↓
new stage reviews/comparisons
```

Do not do:

```text
fixture historical review

        +

new stage

        =

pretend required evidence is satisfied
```

Historical data may be used for:

* regression testing;
* migration testing;
* import/export testing;
* calculation tests where explicitly scoped;
* isolation tests.

It must not silently become new judging evidence.

---

# 60. PHASE 56 — TESTING STRATEGY

Testing must be divided into four levels.

## 56.1 Mathematical unit tests

Test independently:

* exact rubric `R`;
* pairwise evidence requirements;
* distinct judge constraint;
* workload parity;
* PairLoss;
* deterministic randomization;
* deterministic assignment;
* initial pair generation;
* pairwise graph connectivity;
* adaptive pair priority;
* connectivity protection;
* rubric raw score;
* WLS offsets;
* normalization;
* disagreement;
* Bradley–Terry;
* standard errors;
* boundary stability;
* advancement;
* tie hashing.

## 56.2 Property tests

For arbitrary valid:

```text
N

J

R
```

verify for RUBRIC:

```text
every submission gets R judges

no duplicate judge/submission pair

load difference <= 1
```

when feasible.

For PAIRWISE, verify properties such as:

```text
no self-comparisons

no invalid duplicate comparison units

initial comparison graph satisfies required connectivity

all comparison assignments use eligible judges

judge workload satisfies configured constraints

adaptive selection does not disconnect the graph

adaptive batches preserve previous evidence

```

## 56.3 Security tests

Attempt:

```text
judge A → judge B reviews

judge A → aggregate scores

judge A → normalization internals

judge A → pairwise θ

judge A → adaptive priority

judge A → track B

participant → judge endpoints

cross-event ID manipulation

assignment ID manipulation

submission ID manipulation

comparison ID manipulation
```

All must fail appropriately.

## 56.4 End-to-end tests

Test:

```text
create event

↓

invite judges

↓

configure stage

↓

validate

↓

assign

↓

open

↓

submit reviews/comparisons

↓

close

↓

calculate

↓

normalize / model

↓

rank

↓

export

↓

finalize
```

For PAIRWISE specifically:

```text
create pairwise stage

↓

deterministic randomization

↓

initial pair generation

↓

initial assignment

↓

initial comparisons

↓

Bradley–Terry fit

↓

adaptive pair selection

↓

adaptive assignment

↓

additional comparisons

↓

Bradley–Terry refit

↓

boundary/stopping check

↓

rank/advance

↓

finalize
```

---

# 61. PHASE 57 — DETERMINISM TESTING

Run assignment/calculation twice with identical:

```text
input

configuration

algorithm version

seed
```

Expected:

```text
assignment A == assignment B

calculation A == calculation B

ranking A == ranking B
```

For PAIRWISE, also verify:

```text
initial randomized order A == initial randomized order B

initial pairs A == initial pairs B

adaptive selection A == adaptive selection B
```

when the completed evidence and all inputs are identical.

Repeat with different seed:

```text
initial assignment/pair generation may change
```

while all hard invariants remain satisfied.

Adaptive calculation must remain deterministic given identical:

```text
prior evidence

configuration

model version

assignment version

seed
```

---

# 62. PHASE 58 — SCALE TESTING

The fixture is approximately:

```text
40 projects

30 judges

8 tracks
```

but the assignment engine must not be written specifically for those values.

Test at least:

```text
10 submissions

5 judges

40 submissions

30 judges

100 submissions

30 judges

500 submissions

50 judges
```

or equivalent larger synthetic populations.

The assignment algorithm must remain polynomial/deterministic and must not enumerate all assignment combinations.

Pairwise candidate generation and adaptive selection must also avoid exhaustive enumeration of all possible judge/pair assignments.

---

# 63. PHASE 59 — TYPE 1 ACCEPTANCE MATRIX

Verify:

| Requirement                              | Expected |
| ---------------------------------------- | -------- |
| Global submission pool                   | PASS     |
| Configurable stage                       | PASS     |
| Configurable method                      | PASS     |
| Exact R for RUBRIC                       | PASS     |
| Pairwise evidence configuration          | PASS     |
| Distinct judges                          | PASS     |
| Workload difference ≤ 1 where applicable | PASS     |
| Deterministic assignment                 | PASS     |
| Deterministic randomization              | PASS     |
| Overlap/evidence optimization            | PASS     |
| Connectivity validation                  | PASS     |
| Pairwise cold start                      | PASS     |
| Pairwise initial assignment              | PASS     |
| Bradley–Terry                            | PASS     |
| Adaptive pair selection                  | PASS     |
| Protected exploration                    | PASS     |
| Boundary stability                       | PASS     |
| Rubric mode                              | PASS     |
| WLS normalization                        | PASS     |
| Full precision ranking                   | PASS     |
| Deterministic tie-break                  | PASS     |
| Stage isolation                          | PASS     |
| Configured advancement                   | PASS     |

---

# 64. PHASE 60 — TYPE 2 ACCEPTANCE MATRIX

Verify:

| Requirement                                | Expected |
| ------------------------------------------ | -------- |
| Track-specific submission pools            | PASS     |
| Judge-track eligibility                    | PASS     |
| Judge may belong to multiple tracks        | PASS     |
| Track assignment isolation                 | PASS     |
| Exact R per rubric track                   | PASS     |
| Pairwise evidence per track                | PASS     |
| Workload parity per track                  | PASS     |
| Overlap/evidence optimization per track    | PASS     |
| Track calibration                          | PASS     |
| Track ranking                              | PASS     |
| Track winners                              | PASS     |
| Global overlap graph                       | PASS     |
| Global evidence sufficiency                | PASS     |
| Global WLS when supported                  | PASS     |
| No cross-track comparison when unsupported | PASS     |
| Candidate selection fallback               | PASS     |
| Fresh overall panel                        | PASS     |
| Fresh overall judging                      | PASS     |
| Overall ranking                            | PASS     |

---

# 65. PHASE 61 — DOGFOOD T2 ACCEPTANCE

The existing acceptance suite must pass the baseline checks:

```text
T2 judge sees own scores

T2 judge cannot see peer scores

T2 participant blocked

T2 CSV export works
```

The DOGFOOD public specification identifies these T2 capabilities as core judging requirements:

```text
Judge invitation and assignment

Weighted configurable rubric

Backend role isolation

Live progress

Cross-judge normalization

CSV export
```

---

# 66. PHASE 62 — DOCUMENTATION

Update:

```text
README.md

ARCHITECTURE.md

DATA-MODEL.md

JUDGING.md

acceptance-report.txt
```

`JUDGING.md` must explain:

```text
assignment

review/evidence count

workload balancing

overlap

pairwise cold-start randomization

initial pair generation

pairwise judge assignment

Bradley–Terry

adaptive pair selection

protected exploration

boundary stability

rubric scoring

WLS

normalization

track isolation

global calibration

overall fallback

ranking

dropout

finalization
```

The DOGFOOD brief explicitly identifies `JUDGING.md` as an important deliverable because judging integrity is a major evaluation criterion.

---

# 67. PHASE 63 — FINAL IMPLEMENTATION ORDER

The engineering sequence should therefore be:

```text
01. Inspect T1
        ↓
02. Map existing entities
        ↓
03. Design judging schema extension
        ↓
04. Add migrations
        ↓
05. Judge management
        ↓
06. Stage state machine
        ↓
07. Stage configuration
        ↓
08. Rubric versioning
        ↓
09. Common feasibility engine
        ↓
10. Common assignment infrastructure
        ↓
11. RUBRIC assignment strategy
        ↓
12. Exact-R validation
        ↓
13. Workload balancing
        ↓
14. Overlap optimization
        ↓
15. Connectivity validation
        ↓
16. Deterministic repair
        ↓
17. Judge review workflow
        ↓
18. Backend judge isolation
        ↓
19. RUBRIC raw scoring
        ↓
20. WLS normalization
        ↓
21. Disagreement metrics
        ↓
22. PAIRWISE deterministic randomization
        ↓
23. PAIRWISE initial pair generation
        ↓
24. PAIRWISE initial judge assignment
        ↓
25. Initial pairwise evidence collection
        ↓
26. Bradley–Terry model engine
        ↓
27. PAIRWISE adaptive pair selection
        ↓
28. PAIRWISE adaptive judge assignment
        ↓
29. Bradley–Terry refit
        ↓
30. Pairwise boundary stability
        ↓
31. Pairwise advancement
        ↓
32. Type 1 multi-stage pipeline
        ↓
33. Type 2 track eligibility
        ↓
34. Independent track assignment
        ↓
35. Track calibration
        ↓
36. Track ranking
        ↓
37. Global evidence analysis
        ↓
38. Global WLS path
        ↓
39. Candidate-selection fallback
        ↓
40. Fresh overall judging
        ↓
41. Progress dashboard
        ↓
42. CSV exports
        ↓
43. Judge dropout/reassignment
        ↓
44. Audit trail
        ↓
45. Finalization snapshot
        ↓
46. Deterministic tie handling
        ↓
47. Mathematical tests
        ↓
48. Security tests
        ↓
49. Fixture tests
        ↓
50. End-to-end acceptance
        ↓
51. Docker/offline verification
        ↓
52. Documentation
        ↓
53. Final acceptance report
```

---

# 68. DEFINITION OF DONE

Tier 2 is complete only when all of the following are true.

## Judging configuration

* [ ] Type 1 supported
* [ ] Type 2 supported
* [ ] stages configurable
* [ ] methods configurable
* [ ] `R` configurable where applicable
* [ ] pairwise evidence configuration supported
* [ ] eligible judges configurable
* [ ] track eligibility configurable
* [ ] advancement configurable

## Assignment

* [ ] feasibility checked
* [ ] exact R for RUBRIC
* [ ] pairwise evidence requirements enforced
* [ ] distinct judges where required
* [ ] workload difference ≤ 1 where required
* [ ] deterministic
* [ ] deterministic cold-start randomization
* [ ] overlap/evidence optimized
* [ ] connectivity checked
* [ ] repair bounded
* [ ] no partial invalid assignment

## Reviews

* [ ] judge drafts
* [ ] judge submits
* [ ] submitted evidence immutable
* [ ] judge isolation enforced server-side

## Rubric

* [ ] weighted criteria
* [ ] weights sum to 1
* [ ] raw score calculation
* [ ] frozen rubric version
* [ ] WLS calibration
* [ ] normalized scores
* [ ] disagreement metric

## Pairwise

* [ ] pairwise assignment
* [ ] deterministic initial randomization
* [ ] cold-start initial pair generation
* [ ] initial comparison graph connected where required
* [ ] initial comparisons assigned through common Assignment Engine
* [ ] Bradley–Terry
* [ ] regularization λ = 0.1
* [ ] standard errors
* [ ] adaptive pair selection
* [ ] protected exploration
* [ ] connectivity protection
* [ ] adaptive assignment versions
* [ ] boundary stability
* [ ] uncertain-boundary state
* [ ] configured stopping
* [ ] deterministic advancement

## Type 2

* [ ] independent track pools
* [ ] track-specific eligibility
* [ ] independent assignment
* [ ] independent calibration
* [ ] independent ranklists
* [ ] track winners
* [ ] global evidence analysis
* [ ] global WLS when supported
* [ ] fallback candidate selection when unsupported
* [ ] fresh overall judging
* [ ] no silent cross-track score comparison

## Operations

* [ ] progress dashboard
* [ ] assignments CSV
* [ ] raw reviews CSV
* [ ] normalization CSV
* [ ] pairwise evidence CSV
* [ ] final results CSV
* [ ] dropout/reassignment
* [ ] audit trail
* [ ] immutable finalization

## Reproducibility

* [ ] deterministic assignment
* [ ] deterministic initial pair generation
* [ ] deterministic adaptive selection
* [ ] deterministic calculation
* [ ] deterministic ranking
* [ ] algorithm version stored
* [ ] seed stored
* [ ] assignment versions stored
* [ ] final snapshot hash

## Platform

* [ ] existing T1 behavior preserved
* [ ] existing fixture IDs preserved
* [ ] historical fixture scores not reused as new-stage evidence
* [ ] no cloud dependency
* [ ] `docker compose up` works
* [ ] acceptance suite passes
* [ ] README updated
* [ ] ARCHITECTURE updated
* [ ] DATA-MODEL updated
* [ ] JUDGING updated
* [ ] acceptance report committed

---

# 69. IMPLEMENTATION BOUNDARY

The implementation should be judged as:

```text
T1

+

T2 judging engine
```

not as a new application.

The key architectural outcome is:

```text
                         JUDGING ENGINE
                               │
                ┌──────────────┴──────────────┐
                │                             │
             TYPE 1                         TYPE 2
           NO TRACKS                        TRACKS
                │                             │
         configured stages              track domains
                │                             │
        ┌───────┴───────┐             same assignment
        │               │                infrastructure
     PAIRWISE         RUBRIC                │
        │               │                   │
        │               │             independent
        │               │              calibration
        │               │                   │
        ▼               ▼                   ▼
   PAIRWISE           WLS             track ranklists
   STRATEGY
        │
   ┌────┴─────┐
   │          │
INITIAL     ADAPTIVE
RANDOMIZED  BT-DRIVEN
PAIRS       PAIRS
   │          │
   └────┬─────┘
        │
        ▼
COMMON ASSIGNMENT ENGINE
        │
        ▼
   HUMAN EVIDENCE
        │
        ▼
 Bradley–Terry
        │
        ▼
 configured
 advancement
```

For Type 2:

```text
track ranklists
       │
       ▼
global evidence decision
       │
 ┌─────┴─────┐
 │           │
supported  unsupported
 │           │
 ▼           ▼
global WLS  candidate pool
             │
             ▼
       fresh overall judging
```

The intended architecture is therefore:

```text
ONE REUSABLE ASSIGNMENT ENGINE

+

METHOD-SPECIFIC ASSIGNMENT STRATEGIES

+

METHOD-SPECIFIC MATHEMATICS

+

TRACK-SPECIFIC ASSIGNMENT DOMAINS

+

EVIDENCE-DRIVEN CALIBRATION

+

NO SILENT WEAKENING OF THE MATHEMATICAL MODEL
```

The important PAIRWISE boundary is:

```text
PAIRWISE STRATEGY

    ├── InitialPairStrategy
    │       └── deterministic randomization
    │           + cold-start coverage
    │           + connectivity
    │
    └── AdaptivePairStrategy
            └── Bradley–Terry
                + uncertainty
                + boundary protection
                + information value
                + evidence balancing
                + connectivity protection
```

The Bradley–Terry engine does not replace the Assignment Engine.

The Assignment Engine does not replace the Bradley–Terry engine.

They are separate responsibilities connected by the pairwise scheduling loop.

---

# 70. ENGINEERING RULE

The most important implementation rule is:

> **Configuration determines what the judging system is supposed to do; completed evidence determines what mathematical operation is actually supportable.**

For PAIRWISE, this additionally means:

> **The system must establish an unbiased deterministic cold-start evidence set before using Bradley–Terry to adaptively decide which comparisons should be gathered next.**

Therefore:

```text
NEVER silently reduce R.

NEVER silently reduce configured pairwise evidence.

NEVER silently duplicate judges.

NEVER silently violate track eligibility.

NEVER silently change judging method.

NEVER silently use Bradley–Terry before initial evidence exists.

NEVER silently replace cold-start randomization with model-derived initial rankings.

NEVER silently reuse previous-stage scores.

NEVER silently compare independent track-normalized scores.

NEVER silently calibrate disconnected judge components.

NEVER silently discard completed reviews/comparisons.

NEVER silently mutate an active assignment.

NEVER silently disconnect the pairwise comparison graph.

NEVER silently treat θ as a rubric score.

NEVER silently convert an uncertain pairwise boundary into a certain result.
```

Every unsupported condition must become an explicit:

```text
validation failure

OR

documented fallback defined by the judging model.
```

That is the implementation standard for Tier 2.
