# JUDGING.md — DOGFOOD HACKATHON

> **A configuration-driven judging system for balanced assignment, statistically defensible normalization, track isolation, and deterministic final results.**

The judging system is designed to adapt to the number of submissions, judges, reviews, stages, tracks, and configured judging methods without silently changing the judging model.

It supports two competition architectures:

- **Type 1 — No Tracks:** one global submission pool.
- **Type 2 — Multi-Track:** independent track pools, with optional overall judging.

The central architectural rule is:

> **A judging stage is configurable. `PAIRWISE` and `RUBRIC` are methods of a stage, not permanently fixed phases.**

---

## Navigation

- [1. System Overview](#1-system-overview)
- [2. Judging Lifecycle](#2-judging-lifecycle)
- [3. Competition Types](#3-competition-types)
- [4. Configuration Model](#4-configuration-model)
- [5. Universal Guarantees](#5-universal-guarantees)
- [6. Assignment Engine](#6-assignment-engine)
- [7. Type 1 — No Tracks](#7-type-1--no-tracks)
- [8. Type 2 — Multi-Track](#8-type-2--multi-track)
- [9. Overall Judging](#9-overall-judging)
- [10. Failure and Adversarial Cases](#10-failure-and-adversarial-cases)
- [11. Finalization and Audit](#11-finalization-and-audit)
- [12. Mathematical Reference](#12-mathematical-reference)
- [13. Architectural Rules](#13-architectural-rules)

---

# 1. System Overview

The platform separates judging into four concerns:

```text
CONFIGURATION
     │
     ▼
FEASIBILITY
     │
     ▼
ASSIGNMENT
     │
     ▼
HUMAN JUDGING
     │
     ▼
METHOD-SPECIFIC AGGREGATION
     │
     ▼
CALIBRATION / NORMALIZATION
     │
     ▼
RANKING / ADVANCEMENT
     │
     ▼
AUDIT + FINALIZATION
```

The system is intentionally **configuration-driven**.

For every stage, the organizer defines:

- eligible judges;
- required reviews or comparisons;
- input population;
- judging method;
- advancement/output rules;
- stage order;
- track eligibility where applicable;
- whether an overall stage is required;
- final output type.

The assignment engine then determines whether the requested configuration is mathematically feasible.

> **Design rule:** configuration defines what the system is expected and permitted to do. Completed judging evidence determines whether calibration-dependent operations are statistically supportable.

---

## 1.1 The Complete Architecture

<p align="center">
  <img src="../assets/Submission Judging Workflows by Track Structure.png" alt="Submission Judging Workflows by Track Structure" width="900">
</p>

---

# 2. Judging Lifecycle

Every configured stage follows the same high-level lifecycle:

```text
1. Define input population
          ↓
2. Determine eligible judges
          ↓
3. Validate feasibility
          ↓
4. Generate deterministic assignment
          ↓
5. Human judges evaluate
          ↓
6. Store immutable raw evidence
          ↓
7. Run method-specific aggregation
          ↓
8. Calibrate when mathematically supported
          ↓
9. Produce configured stage output
          ↓
10. Audit and snapshot
```

A later stage receives only the population explicitly specified by its advancement configuration.

A stage does not silently inherit another stage's scores.

---

## 2.1 Stage Is the Fundamental Unit

A competition can legally be configured as:

```text
Stage 1 → PAIRWISE
Stage 2 → PAIRWISE
Stage 3 → RUBRIC
Stage 4 → RUBRIC
```

or:

```text
Stage 1 → RUBRIC
Stage 2 → RUBRIC
```

or:

```text
Stage 1 → PAIRWISE
Stage 2 → RUBRIC
Stage 3 → PAIRWISE
```

The platform must not infer a method from the stage number.

---

# 3. Competition Types

## 3.1 Type 1 — No Tracks

There is one global submission pool:

```text
ALL VALID SUBMISSIONS
          │
          ▼
   CONFIGURED STAGE
          │
    ┌─────┴─────┐
    ▼           ▼
PAIRWISE      RUBRIC
    │           │
    ▼           ▼
Bradley–Terry  WLS
    │           │
    └─────┬─────┘
          ▼
Configured advancement/output
```

All eligible judges operate in the same judging universe.

---

## 3.2 Type 2 — Multi-Track

Submissions belong to independent tracks:

```text
                  SUBMISSIONS
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Track A     Track B     Track C
          │           │           │
          ▼           ▼           ▼
      Eligible     Eligible     Eligible
       Judges       Judges       Judges
          │           │           │
          ▼           ▼           ▼
      Judging      Judging      Judging
          │           │           │
          ▼           ▼           ▼
      Ranklist     Ranklist     Ranklist
```

Track restrictions change the **assignment domain**, not the fundamental assignment mathematics.

A judge may belong to multiple tracks.

A judge must never receive a submission from a track outside their configured eligibility.

---

# 4. Configuration Model

A competition conceptually contains:

```text
Competition
│
├── type
│   ├── TYPE_1_NO_TRACKS
│   └── TYPE_2_MULTI_TRACK
│
├── judges[]
│
├── judging_stages[]
│   ├── stage_id
│   ├── method
│   │   ├── PAIRWISE
│   │   └── RUBRIC
│   ├── eligible_judges
│   ├── required_reviews / comparison_budget
│   ├── input_population
│   └── advancement/output configuration
│
├── tracks[]                         # Type 2 only
│   ├── track_id
│   └── eligible_judges[]
│
├── overall_configuration            # Type 2 only, when overall is required
│   ├── enabled
│   ├── overall_judges
│   ├── overall_reviews
│   └── candidate_selection_policy
│
└── result_configuration
    ├── TRACK_WINNERS
    ├── OVERALL_WINNERS
    └── TRACK_AND_OVERALL_WINNERS
```

**Important:** global calibration is **not** an organizer-configured boolean. After track judging, the system evaluates the actual completed evidence and determines whether one global calibration model is statistically supportable.

---

# 5. Universal Guarantees

## 5.1 Exact Review Count

If a review-style stage requires `R_s` reviews per submission, every submission entering that stage must receive:

$$
R_s
$$

distinct eligible judges, unless the stage is finalized under a documented dropout-repair procedure.

```text
reviews(submission) = R_s
```

A judge must never be assigned to the same submission twice.

---

## 5.2 Workload Parity

For:

- $N_s$ submissions;
- $R_s$ reviews per submission;
- $J_s$ active judges;

the total assignment count is:

$$
A_s=N_sR_s
$$

Define:

$$
q=\left\lfloor\frac{A_s}{J_s}\right\rfloor
$$

and:

$$
e=A_s\bmod J_s
$$

Exactly $e$ judges receive $q+1$ assignments. The remaining judges receive $q$.

Therefore:

$$
\max(load)-\min(load)\le1
$$

when all configured constraints are feasible.

---

## 5.4 Judge-Overlap Graph

For calibration, define:

$$
G_J=(V,E)
$$

where:

- each judge is a vertex;
- an edge exists when two judges evaluated at least one common submission.

Each submission reviewed by \(R_s\) judges creates:

$$
\binom{R_s}{2}
$$

overlap events.

Across \(N_s\) submissions:

$$
E_{\text{overlap}}
=
N_s\binom{R_s}{2}
$$

A connected graph with \(J_s\) vertices needs at least \(J_s-1\) edges. Therefore:

$$
N_s\binom{R_s}{2}<J_s-1
\Rightarrow
\texttt{FEASIBILITY\_SPARSE\_OVERLAP}
$$

This is only a necessary condition.

The actual graph must be checked:

$$
C(G_J)=1
$$

before a single global WLS model is fitted.

> **Fail closed:** passing the edge-count check does not prove connectivity.
## 5.5 Single-Review Exception

When:

$$
R_s=1
$$

there is no judge overlap:

$$
\binom{1}{2}=0
$$

Therefore cross-judge WLS calibration is bypassed:

$$
b_j=0
$$

The result must not be represented as cross-judge normalized.

---

## 5.6 Immutable Evidence

The following are append-only and immutable:

- submission identity;
- assignment records;
- raw pairwise outcomes;
- raw rubric criterion scores;
- timestamps;
- judge identity;
- stage identity;
- track identity;
- algorithm version;
- assignment seed.

Calibration, normalization, anomaly detection, and ranking operate on derived data and never overwrite raw evidence.

---

## 5.7 Determinism

Given identical:

- canonical inputs;
- configuration;
- algorithm version;
- assignment seed;

the system must produce identical algorithmic outputs.

Runtime-generated values such as database IDs and timestamps are not hidden sources of randomness.

---

# 6. Assignment Engine

The assignment engine is shared conceptually by both competition types.
Rubrics
<p align="center">
  <img src="../assets/Deterministic Judge Assignment Workflow.png" alt="Deterministic Judge Assignment Workflow" width="900">
</p>

```text
INPUT
 │
 ├── submissions
 ├── judges
 ├── eligibility
 ├── R / comparison budget
 ├── stage configuration
 └── seed
 │
 ▼
FEASIBILITY VALIDATION
 │
 ▼
DETERMINISTIC CONSTRUCTION
 │
 ▼
WORKLOAD BALANCING
 │
 ▼
OVERLAP OPTIMIZATION
 │
 ▼
CONNECTIVITY CHECK
 │
 ▼
VALID ASSIGNMENT
```

## 6.1 Assignment Invariants

A valid review assignment must preserve:

1. exact review count;
2. distinct judges per submission;
3. judge eligibility;
4. workload parity;
5. required overlap/connectivity where calibration depends on it;
6. deterministic reproducibility.

If these cannot all be satisfied, the system rejects the assignment.

---

## 6.2 Rubric Overlap Optimization

For judges $i,j$, let:

$$
O_{ij}
$$

be the number of submissions evaluated by both.

The theoretical average pair overlap is:

$$
P=
\frac{
N_s\binom{R_s}{2}
}{
\binom{J_s}{2}
}
$$

The overlap objective is:

$$
PairLoss
=
\sum_{i<j}(O_{ij}-P)^2
$$

The implementation uses deterministic greedy construction followed by deterministic local improvement.

The optimizer must never sacrifice:

- exact review count;
- distinctness;
- eligibility;
- workload parity;
- required connectivity;

just to improve the overlap objective.

> **Goal:** balanced, useful overlap — not the impossible requirement that every judge pair receive exactly the same number of shared submissions.

---

# 7. Type 1 — No Tracks

## 7.1 Stage Engine

```text
Stage S
│
├── Input population
├── Eligible judges
├── Required reviews / comparisons
├── Method
│   ├── PAIRWISE
│   └── RUBRIC
├── Assignment
├── Human judging
├── Method-specific aggregation
└── Advancement/output
```

---

## 7.2 Type 1 Pairwise

A pairwise interface records only:

```text
A wins
```

or:

```text
B wins
```

It does not expose:

- numeric score;
- tie;
- skip;
- confidence slider.

The logical evidence is:

$$
A\succ B
$$

or:

$$
B\succ A
$$

---

## 7.3 Pairwise Assignment

Comparisons are assigned independently of early model rankings.

A deterministic scheduler may select the preferred judge using:

$$
\text{preferredJudgeIndex}
=
\text{hash}(seed\parallel comparisonId)\bmod J_s
$$

while preserving feasible workload balance:

$$
\max(load)-\min(load)\le1
$$

No submission may be paired with itself.

---

## 7.4 Bradley–Terry Aggregation

For submissions $i,j$:

$$
P(i\succ j)
=
\frac{e^{\theta_i}}
{e^{\theta_i}+e^{\theta_j}}
=
\frac{1}{1+e^{-(\theta_i-\theta_j)}}
$$

The regularized Bradley–Terry objective is:

$$
\max_{\boldsymbol{\theta}}
\left[
\sum_{(i\succ j)}
\log
\left(
\frac{1}{1+e^{-(\theta_i-\theta_j)}}
\right)
-
\lambda\sum_{k=1}^{N_s}\theta_k^2
\right]
$$

subject to:

$$
\sum_k\theta_k=0
$$

The configured implementation uses:

$$
\lambda=0.1
$$

The $L_2$ penalty prevents extreme latent estimates when observed results are highly one-sided.

The resulting $\theta$ values are **stage-local relative strengths**, not rubric scores.

---

## 7.5 Protected Pairwise Exploration

When a stage has an advancement boundary, adaptive comparison scheduling can prioritize pairs that reduce uncertainty around that boundary.

For pair $(i,j)$:

$$
P_{ij}
=
0.40S_{ij}
+
0.30B_{ij}
+
0.20I_{ij}
+
0.10E_{ij}
$$

where:

$$
S_i=
\max
\left(
0,\theta_i+1.96SE_i-\theta_K
\right)
$$

$$
S_{ij}=\frac{S_i+S_j}{2}
$$

$$
B_i=
\exp
\left(
-\frac{|\theta_i-\theta_K|}
{\operatorname{median}(SE)}
\right)
$$

$$
B_{ij}=\frac{B_i+B_j}{2}
$$

$$
I_{ij}=4p_{ij}(1-p_{ij})
$$

$$
E_{ij}=\frac{1}{1+C_i+C_j}
$$

If adaptive scheduling would disconnect the comparison graph, connectivity protection overrides normal priority selection.

---

## 7.6 Pairwise Advancement

A pairwise stage does not automatically imply a shortlist.

The organizer configures the output, such as:

- all submissions continue;
- exactly $K_s$ advance;
- a configured percentage advances;
- another explicit advancement rule.

For an exact boundary $K_s$:

$$
\Delta_{K_s}
=
\theta_{K_s}-\theta_{K_s+1}
$$

A boundary stability condition is:

$$
\Delta_{K_s}
>
1.96
\sqrt{
SE_{K_s}^2+SE_{K_s+1}^2
}
$$

If the configured comparison budget ends before stability is reached, the system records:

```text
SHORTLIST_BOUNDARY_UNCERTAIN
```

The configured fallback still uses the model estimate and deterministic SHA-256 tie resolution.

---

## 7.7 Type 1 Rubric

For a rubric stage:

$$
A_s=N_sR_s
$$

Every submission receives exactly $R_s$ distinct eligible judges when feasible.

Workloads use:

$$
baseQuota=
\left\lfloor
\frac{N_sR_s}{J_s}
\right\rfloor
$$

$$
extra=(N_sR_s)\bmod J_s
$$

Exactly `extra` judges receive `baseQuota + 1`; the rest receive `baseQuota`.

---

## 7.8 Rubric Scoring

For submission $s$, judge $j$, criterion $c$:

$$
r(s,j)
=
100
\sum_c
w_c
\frac{score(s,j,c)}{max_c}
$$

with:

$$
\sum_c w_c=1
$$

Therefore:

$$
0\le r(s,j)\le100
$$

Raw criterion scores and raw judge scores remain immutable.

---

## 7.9 WLS Judge Calibration

Assume:

$$
r(s,j)=\theta_s+b_j+\epsilon_{s,j}
$$

For judges $i,j$, let $\omega_{ij}$ be the number of shared submissions.

Their mean score difference is:

$$
\bar d_{ij}
=
\frac{1}{\omega_{ij}}
\sum_{s\in Shared(i,j)}
(r(s,i)-r(s,j))
$$

Judge offsets are estimated by:

$$
\min_{\mathbf b}
\sum_{i<j}
\omega_{ij}
\left[
(b_i-b_j)-\bar d_{ij}
\right]^2
$$

subject to:

$$
\sum_jb_j=0
$$

Under independent, homoscedastic review noise:

$$
\operatorname{Var}(r(s,i)-r(s,j))=2\sigma^2
$$

and therefore:

$$
\operatorname{Var}(\bar d_{ij})
=
\frac{2\sigma^2}{\omega_{ij}}
$$

so inverse-variance weighting gives:

$$
w_{ij}\propto\omega_{ij}
$$

Every edge with:

$$
\omega_{ij}\ge1
$$

is valid evidence and must not be discarded merely because its overlap count is one.

---

## 7.10 Rubric Normalization

For judge $j$:

$$
n(s,j)=r(s,j)-b_j
$$

The aggregate is first calculated without clamping:

$$
F_{\text{raw}}(s)
=
\frac1{R_s}
\sum_j n(s,j)
$$

The published score is clamped exactly once:

$$
F_s
=
\min(100,\max(0,F_{\text{raw}}(s)))
$$

Ranking uses the full-precision:

$$
F_{\text{raw}}(s)
$$

not the displayed clamped value.

Thus two submissions displayed as `100` can still have different internal rankings.

---

## 7.11 Rubric Disagreement

Judge disagreement is measured by:

$$
SD_s
=
\sqrt{
\frac{
\sum_j(n(s,j)-F_{\text{raw}}(s))^2
}{
R_s-1
}
}
$$

High disagreement creates an audit signal.

It does not automatically reduce the submission's score.

---

# 8. Type 2 — Multi-Track

## 8.1 Judge ↔ Track Eligibility

Track eligibility is explicitly configured.

Example:

```text
Judge 1 → Track A
Judge 2 → Track A, Track C
Judge 3 → Track B
Judge 4 → Track A, Track B
```

For submission $s$ in track $t$:

$$
t\notin Eligible(j)
\Rightarrow
j\text{ cannot receive }s
$$

The backend must enforce this rule. UI filtering alone is insufficient.

---

## 8.2 Track Isolation

Each track is evaluated as its own judging universe:

```text
Track submissions
       │
       ▼
Eligible judges
       │
       ▼
Assignment
       │
       ▼
Judging
       │
       ▼
Track calibration
       │
       ▼
Track ranklist
```

For track $t$:

- $N_t$ = submissions;
- $J_t$ = eligible judges;
- $R_t$ = required reviews.

Then:

$$
A_t=N_tR_t
$$

The same assignment and feasibility mathematics applies within the track.

---

## 8.3 Track Calibration

For rubric judging within track $t$:

$$
\sum_{j\in J_t}b_{j,t}=0
$$

and:

$$
F_{t,\text{raw}}(s)
=
\frac1{R_t}
\sum_{j\in J_t}
(r(s,j)-b_{j,t})
$$

Track rankings are generated only within that track's calibrated judging universe.

There is no automatic cross-track normalization.

---

## 8.4 Track Rank Is Not Global Rank

Track size is not a quality signal.

For example:

```text
Track A = 100 submissions
Track C = 10 submissions
```

does not imply that rank `#10` in A is globally weaker or stronger than rank `#2` in C.

The system must never silently interpret:

```text
track size → quality
track rank → global rank
track score → global score
```

---

# 9. Overall Judging

Overall results require an explicit cross-track comparison mechanism.

There are two supported paths.

```text
                   TRACK JUDGING COMPLETE
                             │
                             ▼
                  Build global evidence
                             │
                             ▼
                  Judge-overlap graph
                             │
                             ▼
               Connectivity + evidence check
                       ┌─────┴─────┐
                       │           │
                   Supported   Unsupported
                       │           │
                       ▼           ▼
                  Global WLS   Candidate pool
                       │           │
                       │           ▼
                       │      Fresh overall panel
                       │           │
                       │           ▼
                       │      Fresh judging
                       │           │
                       └─────┬─────┘
                             ▼
                       Overall results
```

## 9.1 Global Calibration Is Data-Driven

Global calibration is **not** an organizer-configured switch.

After track judging, the system evaluates actual completed evidence.

Construct:

$$
G_J=(J,E)
$$

where an edge exists when judges have jointly evaluated at least one relevant submission.

First check:

$$
C(G_J)=1
$$

Connectivity alone is not enough. The system must also verify that the available shared evidence is sufficient for the calibration model.

If supported, a single global WLS calibration is computed over the relevant raw rubric evidence:

$$
\min_b
\sum_{i<j}
\omega_{ij}
\left[
(b_i-b_j)-\bar d_{ij}
\right]^2
$$

subject to:

$$
\sum_jb_j=0
$$

Then:

$$
n(s,j)=r(s,j)-b_j
$$

and:

$$
F_{\text{global,raw}}(s)
=
\frac1{R_s}
\sum_jn(s,j)
$$

The system must record:

- calibration universe;
- included judges;
- included submissions;
- overlap counts;
- connectivity;
- feasibility checks;
- WLS solution;
- algorithm version;
- global scores;
- final ranking;
- audit/hash information.

> **Track calibration ≠ global calibration.**

A global model is a new calibration computation over global evidence. Track-normalized scores are not merely relabeled as global scores.

---

## 9.2 When Global Calibration Is Unsupported

If completed evidence does not support one connected global calibration model:

$$
F_A(s)\not\equiv F_B(s)
$$

merely because both values use the `0–100` scale.

Instead:

```text
Track A ranklist ──┐
Track B ranklist ──┼──► Candidate selection
Track C ranklist ──┘
                         │
                         ▼
                  New overall panel
                         │
                         ▼
                  Fresh judging
                         │
                         ▼
                  Overall results
```

Track-normalized scores are used **only for candidate selection**.

They do not become overall scores.

---

## 9.3 Candidate Selection

The candidate-selection policy must be explicit.

### Fixed Per-Track

Each track contributes:

$$
K_t=K
$$

### Proportional

For total candidate capacity $M$:

$$
K_t
\approx
M\frac{N_t}{\sum_uN_u}
$$

### Hybrid

Each track receives a minimum candidate count, then remaining capacity is distributed proportionally.

The policy must be deterministic.

The purpose is representation, not to infer quality from track size.

---

## 9.4 Fresh Overall Judging

The overall stage has its own:

- judge panel;
- review count;
- assignment;
- workload balancing;
- overlap requirements;
- method;
- calibration;
- ranking;
- audit.

It may use either method.

### Overall Pairwise

Fresh comparisons produce a new Bradley–Terry model:

$$
P(i\succ j)
=
\frac{e^{\theta_i}}
{e^{\theta_i}+e^{\theta_j}}
$$

Track scores are not carried into the overall numerical score.

### Overall Rubric

Fresh rubric reviews produce new raw evidence and a new WLS calibration:

$$
\min_b
\sum_{i<j}
\omega_{ij}
\left[
(b_i-b_j)-\bar d_{ij}
\right]^2
$$

subject to:

$$
\sum_jb_j=0
$$

The resulting calibrated evidence determines the overall ranking.

---

# 10. Failure and Adversarial Cases

## 10.1 Fail-Closed Governance

The system must not silently:

- reduce requested review counts;
- assign a submission twice to the same judge;
- violate track eligibility;
- remove judges without recording the change;
- treat disconnected calibration components as one population;
- change the configured judging method;
- change the number of stages;
- compare independently normalized track scores as globally calibrated.

---

## 10.2 Judge Dropout

If a judge becomes unavailable:

1. completed valid reviews remain immutable;
2. unfinished assignments are identified;
3. remaining eligible judges are checked for replacement capacity;
4. replacement assignments are deterministic;
5. duplicate judge/submission assignments are prohibited;
6. workload parity is revalidated;
7. track eligibility is revalidated;
8. required overlap/connectivity is revalidated.

If a required calibration graph becomes disconnected, the system fails closed.

It must not silently replace one global model with disconnected component-wise calibration unless component-wise calibration was explicitly defined as a valid judging model.

---

## 10.3 Extreme Judge Behavior

The system can record audit indicators such as:

```text
EXTREME_OFFSET
COMPRESSED_RANGE
HIGH_DISAGREEMENT
```

WLS calibration estimates relative judge offsets from overlapping evidence.

These indicators trigger investigation; they do not automatically rewrite raw evidence.

Calibration is not a guarantee that malicious behavior is perfectly eliminated.

---

## 10.4 Unlucky Pairings

Pairwise judging can produce misleading evidence if a submission initially faces unusually weak or strong opponents.

Bradley–Terry accounts for opponent strength.

Protected exploration can prioritize comparisons near an advancement boundary.

---

## 10.5 Exact Tie Resolution

If:

$$
F_{\text{raw}}(A)=F_{\text{raw}}(B)
$$

at full precision, compute:

$$
tieKey=
SHA256(
canonicalEncode(
competitionId,
judgingVersion,
submissionId
))
$$

and order lexicographically by byte sequence.

This avoids database ordering and unseeded randomness.

---

# 11. Finalization and Audit

Every finalized competition stores an immutable snapshot.

```text
FINALIZATION SNAPSHOT
│
├── competition_id
├── competition_type
├── algorithm_version
├── assignment_seed
│
├── organizer_configuration
│   ├── judge_count
│   ├── review_count
│   ├── stage_count
│   ├── stage_methods
│   ├── advancement_rules
│   ├── track_configuration
│   ├── judge_track_eligibility
│   ├── overall_configuration
│   └── result_configuration
│
├── feasibility_validation
│
├── stage_audits[]
│   ├── stage_id
│   ├── method
│   ├── input_population
│   ├── judge_panel
│   ├── assignments
│   ├── workload_distribution
│   ├── overlap_matrix
│   └── connectivity_status
│
├── pairwise_audits[]
│   ├── raw_pairwise_outcomes
│   ├── BT_theta
│   └── boundary_stability
│
├── rubric_audits[]
│   ├── raw_criterion_scores
│   ├── WLS_offsets
│   ├── overlap_matrix
│   ├── F_raw
│   ├── F_published
│   └── disagreement_metrics
│
├── track_audits[]
│   ├── track_id
│   ├── eligible_judges
│   ├── track_assignments
│   ├── track_calibration
│   └── track_ranklist
│
├── overall_audit
│   ├── global_calibration_status
│   ├── candidate_selection_policy
│   ├── selected_candidates
│   ├── overall_panel
│   ├── overall_assignments
│   ├── overall_method
│   ├── overall_calibration
│   └── overall_ranklist
│
└── SHA256_snapshot_hash
```

The finalization snapshot makes the judging result reproducible and auditable.

---

# 12. Mathematical Reference

## 12.1 Review Assignment

$$
A_s=N_sR_s
$$

## 12.2 Workload

$$
q=\left\lfloor\frac{A_s}{J_s}\right\rfloor
$$

$$
e=A_s\bmod J_s
$$

$$
\max(load)-\min(load)\le1
$$

## 12.3 Judge Overlap

$$
E_{\text{overlap}}
=
N_s\binom{R_s}{2}
$$

Necessary sparse-overlap condition:

$$
N_s\binom{R_s}{2}<J_s-1
$$

Actual calibration requirement:

$$
C(G_J)=1
$$

## 12.4 Pairwise Probability

$$
P(i\succ j)
=
\frac{e^{\theta_i}}
{e^{\theta_i}+e^{\theta_j}}
$$

## 12.5 Bradley–Terry Objective

$$
\max_{\boldsymbol{\theta}}
\left[
\sum_{(i\succ j)}
\log
\left(
\frac{1}{1+e^{-(\theta_i-\theta_j)}}
\right)
-
\lambda\sum_k\theta_k^2
\right]
$$

$$
\lambda=0.1
$$

$$
\sum_k\theta_k=0
$$

## 12.6 Boundary Stability

$$
\Delta_K=\theta_K-\theta_{K+1}
$$

$$
\Delta_K
>
1.96
\sqrt{SE_K^2+SE_{K+1}^2}
$$

## 12.7 Rubric Score

$$
r(s,j)
=
100
\sum_c
w_c
\frac{score(s,j,c)}{max_c}
$$

$$
\sum_cw_c=1
$$

## 12.8 WLS Calibration

$$
\bar d_{ij}
=
\frac1{\omega_{ij}}
\sum_{s\in Shared(i,j)}
(r(s,i)-r(s,j))
$$

$$
\min_b
\sum_{i<j}
\omega_{ij}
[(b_i-b_j)-\bar d_{ij}]^2
$$

$$
\sum_jb_j=0
$$

## 12.9 Normalized Score

$$
n(s,j)=r(s,j)-b_j
$$

$$
F_{\text{raw}}(s)
=
\frac1{R_s}\sum_jn(s,j)
$$

$$
F_s
=
\min(100,\max(0,F_{\text{raw}}(s)))
$$

## 12.10 Disagreement

$$
SD_s
=
\sqrt{
\frac{
\sum_j(n(s,j)-F_{\text{raw}}(s))^2
}{
R_s-1
}
}
$$

## 12.11 Overlap Objective

$$
P=
\frac{
N_s\binom{R_s}{2}
}{
\binom{J_s}{2}
}
$$

$$
PairLoss
=
\sum_{i<j}(O_{ij}-P)^2
$$

## 12.12 Deterministic Tie Key

$$
tieKey=
SHA256(
canonicalEncode(
competitionId,
judgingVersion,
submissionId
))
$$

---

# 13. Architectural Rules

The following are mandatory.

1. There are two competition types:
   - Type 1 — no tracks;
   - Type 2 — multi-track.

2. Judging stages are configurable.

3. Pairwise and Rubric are stage methods, not fixed phases.

4. The organizer configures judges, reviews, stages, methods, eligibility, and advancement/output rules.

5. Every stage performs feasibility validation before assignment.

6. Every submission receives the configured number of distinct judges when feasible.

7. Workload difference is at most one when configured constraints are feasible.

8. Rubric calibration requires a connected judge-overlap graph.

9. Track judging is isolated by track.

10. Judge-to-track eligibility is explicitly configured.

11. A judge may belong to multiple tracks.

12. A judge cannot receive a submission outside configured track eligibility.

13. Track assignment uses the same mathematical assignment principles as global assignment, constrained to each track's eligible judge pool.

14. Cross-track connectivity is not required merely to perform track judging. It is evaluated when the system determines whether global calibration can be supported.

15. Track rank is not global rank.

16. Track population is not a quality signal.

17. Track-normalized scores must not be directly compared across tracks without a valid global comparison mechanism.

18. Global calibration is a derived decision based on completed judging evidence.

19. If global calibration is statistically supported, a global calibration model is fitted over the relevant global evidence.

20. If global calibration is unsupported, candidates are selected from track ranklists according to the configured deterministic policy.

21. Fresh overall judging uses fresh evidence.

22. Overall judging may be Pairwise or Rubric.

23. Track scores are never silently reused as overall scores.

24. Raw evidence is immutable.

25. Algorithmic output is deterministic given identical canonical inputs, configuration, algorithm version, and seed.

26. Invalid or statistically unsupported configurations fail closed rather than silently degrading the judging model.

---

# Core Design Principle

The platform is **not**:

```text
Phase 1 = Pairwise
Phase 2 = Rubric
```

It is:

```text
COMPETITION
│
├── TYPE 1: NO TRACKS
│      │
│      └── CONFIGURED STAGES
│             ├── Pairwise or Rubric
│             ├── Assignment
│             ├── Human judging
│             ├── Aggregation / calibration
│             └── Configured advancement
│
└── TYPE 2: MULTI-TRACK
       │
       ├── Organizer-defined Judge ↔ Track eligibility
       ├── Independent track assignment
       ├── Independent track judging
       ├── Track calibration
       ├── Track ranklists
       │
       └── Overall stage, if required
              │
              ├── Global calibration when supported
              │
              └── Otherwise candidate selection
                     │
                     └── Fresh overall judging
```

> **The system adapts the assignment and statistical machinery to the event configuration without silently changing the judging rules.**
