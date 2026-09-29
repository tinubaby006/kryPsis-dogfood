# JUDGING.md — Assignment Strategy, Scoring Maths, Normalization Method

# Scope

When an event is conducted, the judging environment can vary significantly. The number of submissions, number of judges, required reviews per submission, number of evaluation stages, and whether the event uses tracks can all differ from one event to another. When tracks are present, the event may require track-specific winners, overall winners, or both.

These variations create a corresponding set of operational and statistical challenges: assigning judges so that workload is balanced, ensuring that enough overlapping evaluation data exists for meaningful score normalization, accounting for differences in judge severity or judging style, identifying anomalous or inconsistent evaluations, handling incomplete or uneven reviews, and maintaining isolation between independent judging groups or tracks where required.

This document describes a unified judging framework designed to address these problems while remaining dynamic to the configuration and scale of the event.

The system uses structured judge assignment, human evaluation, statistical aggregation, cross-judge normalization, anomaly detection, and explicit safeguards to maintain reliable results across different event configurations. Where the scale of submissions makes detailed evaluation impractical, pairwise human evaluation combined with Bradley–Terry aggregation can be used to efficiently reduce the evaluation population before deeper rubric-based evaluation.

The objective is not to impose one fixed judging algorithm on every event, but to provide a robust framework that adapts to the event's parameters while preserving human judgment, statistical validity, transparency, and organizer authority.

The judging system supports two competition architectures:

* **Type 1 — No Tracks:** all valid submissions belong to one global judging pool.
* **Type 2 — Multi-Track:** submissions belong to independent track pools, with optional overall judging across tracks.

The judging process is **configuration-driven**. The system does not assume that pairwise judging must happen first or that rubric judging must happen last.

For every judging stage, the organizer configures:

* number of judges assigned to the stage;
* number of required reviews/comparisons;
* number of judging stages;
* judging method for each stage:

  * `PAIRWISE`
  * `RUBRIC`;
* eligible judges;
* track eligibility where tracks exist;
* which submissions enter the stage;
* advancement/output rules;
* whether overall judging is required;
* whether final output is:

  * track winners,
  * overall winners,
  * or both.

The organizer then executes **Assign** for the configured stage.

The assignment engine validates feasibility, constructs deterministic assignments, balances workload, satisfies the required review count, and optimizes judge overlap where calibration requires shared evidence.

The same mathematical assignment principles are reused across both competition types. Track restrictions change the **assignment domain**, not the fundamental assignment mathematics.


# 0. System Architecture

```text
                         ALL VALID SUBMISSIONS
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             TYPE 1: NO TRACKS            TYPE 2: TRACKS
             Global Submission Pool       Independent Track Pools
                    │                           │
                    │                           ▼
                    │                    Organizer Configures
                    │                    Track Eligibility
                    │                           │
                    │                           ▼
                    │                    Track-specific Assignment
                    │                           │
                    │                           ▼
                    │                    Track-specific Judging
                    │                           │
                    │                           ▼
                    │                    Track-specific Results
                    │                           │
                    │                    ┌──────┴──────────┐
                    │                    │                 │
                    │                    ▼                 ▼
                    │             Track Winners     Overall Required?
                    │             (if configured)          │
                    │                                      │
                    │                                 ┌────┴────┐
                    │                                 │         │
                    │                                NO        YES
                    │                                 │         │
                    │                                 ▼         ▼
                    │                              FINISH   Overall Candidate
                    │                                       Construction
                    │                                             │
                    │                                             ▼
                    │                                  Inspect Completed Judging
                    │                                             │
                    │                                             ▼
                    │                                  Is Global Calibration
                    │                                  Statistically Supported?
                    │                                             │
                    │                                  ┌──────────┴──────────┐
                    │                                  │                     │
                    │                                 YES                   NO
                    │                                  │                     │
                    │                                  ▼                     ▼
                    │                           Global WLS            Select sufficient
                    │                           Calibration             submissions from
                    │                                  │                each track ranklist
                    │                                  │                     │
                    │                                  │                     ▼
                    │                                  │               New Overall Panel
                    │                                  │                     │
                    │                                  │                     ▼
                    │                                  │              Fresh Overall Judging
                    │                                  │                     │
                    │                                  │                     ▼
                    │                                  │              Overall Results
                    │                                  │
                    │                                  ▼
                    │                           Global Ranking
                    │                                  │
                    │                                  ▼
                    │                           Overall Results
                    │
                    ▼
             Organizer Configures
                Judging Stages
                    │
                    ▼
             Configured Stage 1
                    │
                    ▼
             Configured Stage 2
                    │
                   ...
                    │
                    ▼
             Configured Stage S
                    │
                    ▼
             Final Configured Results
```

The important structural rule is:

> **A judging stage is a configurable unit. Pairwise and Rubric are methods of a stage, not permanently assigned phases.**

For example, all of the following configurations are valid when mathematically feasible:

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

The system must not impose an implicit ordering.

## Type 2 Overall Decision

For multi-track competitions, **global calibration is not an organizer-configured option**.

After track judging is completed, the system examines the actual judging evidence and determines whether the completed assignment structure provides sufficient connectivity and shared evidence for one global calibration model.

The decision is therefore:

```text
Completed Track Judging
          │
          ▼
Build Global Judge-Overlap Graph
          │
          ▼
Check Connectivity + Evidence Sufficiency
          │
     ┌────┴────┐
     │         │
   YES         NO
     │         │
     ▼         ▼
Global WLS   Track Ranklists
Calibration       │
     │            ▼
     │      Overall Candidate Pool
     │            │
     │            ▼
     │      New Overall Panel
     │            │
     │            ▼
     │      Fresh Overall Judging
     │            │
     └──────┬─────┘
            │
            ▼
      Overall Results
```

Thus, the system does **not** ask the organizer whether global calibration should be enabled.

It asks:

> **Does the completed judging data provide sufficient connected evidence to support a single global calibration model?**

If yes, the system performs global WLS calibration and uses the resulting globally calibrated evidence for overall ranking.

If no, track-normalized scores are not directly compared across tracks. The system instead constructs the configured overall candidate pool and sends those candidates to a new overall judging panel for fresh judging.

The same principle applies to every calibration-dependent decision:

> **Configuration defines what the system is allowed and expected to do; completed judging data determines whether the mathematical operation is actually supportable.**


# 0.1 Core Configuration Model

A competition configuration conceptually contains:

```text
Competition
│
├── type
│   ├── TYPE_1_NO_TRACKS
│   └── TYPE_2_MULTI_TRACK
│
├── judges
│
├── judging_stages[]
│   ├── stage_id
│   ├── method
│   │   ├── PAIRWISE
│   │   └── RUBRIC
│   ├── eligible_judges
│   ├── required_reviews
│   ├── input_population
│   └── advancement/output configuration
│
├── tracks[]                         # Type 2 only
│   ├── track_id
│   └── eligible_judges[]
│
├── overall_configuration            # optional for Type 2
│   ├── enabled
│   ├── global_calibration
│   ├── overall_judges
│   ├── overall_reviews
│   └── candidate_selection_policy
│
└── result_configuration
    ├── TRACK_WINNERS
    ├── OVERALL_WINNERS
    └── TRACK_AND_OVERALL_WINNERS
```

The actual implementation may use a different database representation, but the behavior must follow these logical constraints.

---

# 0.2 Core Invariants

## Stage Isolation

Results generated by one judging stage are not silently reused as scores in another stage.

For a pairwise stage:

$$
\theta^{(s)}
$$

is a relative-strength estimate belonging only to stage \(s\).

It is **not** a rubric score.

For a rubric stage:

$$
F^{(s)}_{\text{raw}}
$$

is the normalized score generated by that stage's judge panel.

It is not automatically the score of a later stage.

A later stage receives only the data explicitly defined by the organizer's advancement configuration.

---

## Fail-Closed Governance

Invalid configurations or mathematically impossible assignments must be rejected.

The system must not silently:

* reduce the requested review count;
* assign a submission to the same judge twice;
* violate track eligibility;
* remove judges without recording the change;
* use disconnected calibration components as if they formed one calibration population;
* silently change the configured judging method;
* silently change the number of stages;
* silently compare independently normalized track scores as if they were globally calibrated.

---

## Exact Review Count

If a stage requires \(R_s\) reviews per submission, every submission entering that stage must receive:

$$
R_s
$$

distinct eligible judges, unless the stage is explicitly finalized under a documented judge-dropout repair procedure.

For a normal completed assignment:

$$
\text{reviews}(submission)=R_s
$$

---

## Workload Parity

For an assignment pool containing \(N_s\) submissions, \(R_s\) reviews per submission, and \(J_s\) active judges:

$$
A_s=N_sR_s
$$

where \(A_s\) is the total assignment count.

When all active judges participate, workloads are:

$$
q=\left\lfloor\frac{A_s}{J_s}\right\rfloor
$$

and

$$
e=A_s\bmod J_s.
$$

Exactly \(e\) judges receive:

$$
q+1
$$

assignments and the remaining judges receive:

$$
q.
$$

Therefore:

$$
\max(load)-\min(load)\le1.
$$

If this cannot be achieved while satisfying mandatory constraints, the assignment is rejected.

---

## Immutable Evidence

The following are append-only and immutable after creation:

* submission identity;
* assignment records;
* raw pairwise outcomes;
* raw rubric criterion scores;
* timestamps;
* judge identity;
* stage identity;
* track identity;
* algorithm version;
* assignment seed.

Calibration, normalization, anomaly detection, and ranking operate on derived data and never overwrite raw evidence.

---

## Determinism

Given identical:

* canonical inputs;
* configuration;
* algorithm version;
* assignment seed;

the system must generate identical algorithmic outputs.

Runtime-generated values such as timestamps and database identifiers are not used as hidden randomness.

---

# PART I — UNIVERSAL FEASIBILITY & ASSIGNMENT RULES

# 1. Stage-Level Feasibility

Every judging stage is evaluated independently.

Let:

* \(N_s\) = number of submissions entering stage \(s\);
* \(J_s\) = number of active eligible judges;
* \(R_s\) = required reviews per submission.

Then:

$$
A_s=N_sR_s.
$$

The stage must pass feasibility validation before assignments are generated.

---

## 1.1 Too Few Judges

Every submission requires \(R_s\) distinct judges.

Therefore:

$$
R_s>J_s
\implies
\texttt{FEASIBILITY\_TOO\_FEW\_JUDGES}.
$$

A submission must never be assigned twice to the same judge merely to satisfy the review count.

---

## 1.2 Too Many Judges

If every active judge is required to participate:

$$
N_sR_s<J_s
\implies
\texttt{FEASIBILITY\_TOO\_MANY\_JUDGES}.
$$

This prevents an assignment configuration in which the requested judge panel is larger than the available review workload.

This is only a necessary condition. Track eligibility, stage eligibility, preserved assignments, and other constraints may make an assignment infeasible even when this inequality passes.

---

# 2. Calibration Overlap Feasibility

Cross-judge additive calibration requires a connected judge-overlap graph.

Define:

$$
G_J=(V,E)
$$

where:

* each judge is a vertex;
* an edge exists between judges \(i\) and \(j\) if they evaluated at least one common submission.

If \(R_s\ge2\), each submission creates:

$$
\binom{R_s}{2}
$$

judge-pair overlap events.

Across \(N_s\) submissions:

$$
E_{\text{overlap}}
=
N_s\binom{R_s}{2}.
$$

A connected graph with \(J_s\) vertices requires at least:

$$
J_s-1
$$

edges.

Therefore the following is a necessary feasibility condition:

$$
N_s\binom{R_s}{2}<J_s-1
\implies
\texttt{FEASIBILITY\_SPARSE\_OVERLAP}.
$$

Passing this condition does **not** prove connectivity.

The assignment engine must explicitly verify:

$$
C(G_J)=1
$$

before a single global WLS calibration model is fitted.

If the graph is disconnected, the system must reject the calibration configuration rather than pretending that disconnected judge groups are statistically connected.

---

# 3. Single-Review Exception

When:

$$
R_s=1
$$

there is no judge overlap:

$$
\binom{1}{2}=0.
$$

Therefore WLS cross-judge calibration is bypassed:

$$
b_j=0.
$$

The score is the direct result of the assigned evaluator's configured judging process.

It must not be represented as cross-judge normalized.

---

# PART II — TYPE 1: NO-TRACK COMPETITIONS

# 4. Type 1 Definition

A Type 1 competition has:

```text
ONE GLOBAL SUBMISSION POOL
```

There are no track restrictions.

All stage assignments operate over the stage's configured global submission population and its configured eligible judge panel.

The organizer controls:

* number of judges;
* number of required reviews;
* number of judging stages;
* judging method for every stage;
* stage advancement rules;
* final output.

---

# 5. Type 1 Stage Engine

Each stage is represented as:

```text
Stage S
│
├── Input Population
├── Eligible Judges
├── Required Reviews R_s
├── Method
│   ├── PAIRWISE
│   └── RUBRIC
├── Assignment
├── Human Judging
├── Method-specific Aggregation
└── Configured Advancement / Output
```

The assignment engine is selected from the configured method.

---

# 6. Type 1 Pairwise Assignment Engine

When a Type 1 stage uses `PAIRWISE`, the pairwise method is executed in two scheduling modes:

1. **Cold-start initialization** — deterministic randomization and broad initial comparison coverage;
2. **Adaptive scheduling** — Bradley–Terry-driven selection of additional comparisons after human evidence exists.

The pairwise system therefore does **not** begin by using Bradley–Terry to decide which pairs to show. Bradley–Terry is a model of observed human outcomes and cannot drive the initial schedule before evidence exists.

The interface exposes:

* submission A;
* submission B;
* forced selection.

The interface does not expose:

* numeric score;
* tie;
* skip;
* confidence slider.

The human judgment is:

$$
A\succ B
$$

or:

$$
B\succ A.
$$

---

## 6.1 Pairwise Assignment Architecture

Pairwise uses the same **core Assignment Engine infrastructure** as other judging methods, but the assignment domain is method-specific.

The common Assignment Engine is responsible for:

* feasibility validation;
* judge eligibility;
* track eligibility;
* capacity and workload balancing;
* deterministic assignment;
* assignment isolation;
* duplicate/invalid assignment prevention;
* repair handling;
* assignment-versioning and audit records.

The pairwise strategy supplies the comparison units that the common engine assigns.

For rubric judging, the assignment unit is:

$$
submission\times judge.
$$

For pairwise judging, the assignment unit is:

$$
comparison(A,B)\times judge.
$$

Therefore, the common engine is reusable infrastructure, but the pair-generation and scheduling logic is **not identical** between Rubric and Pairwise.

The pairwise architecture is:

```text
Pairwise Stage
    │
    ▼
Deterministic Submission Randomization
    │
    ▼
Initial Pair Generation / Coverage
    │
    ▼
Common Assignment Engine
    │
    ▼
Human Pairwise Outcomes
    │
    ▼
Bradley–Terry Model
    │
    ▼
Adaptive Pair Selection
    │
    ▼
Common Assignment Engine
    │
    ▼
Additional Human Outcomes
    │
    ▼
Bradley–Terry Refit
    │
    └──────────────► repeat until configured stopping condition
```

This ordering is mandatory for a cold-start pairwise stage.

---

## 6.2 Deterministic Submission Randomization

Before any model-driven pair selection, the stage creates a deterministic randomized ordering of the eligible submission population.

Let the stage submission population be:

$$
S_s=\{s_1,s_2,\ldots,s_{N_s}\}.
$$

The randomized order is a deterministic function of:

* stage identity;
* canonical submission population;
* assignment seed;
* algorithm version.

Conceptually:

$$
\pi_s
=
\operatorname{DeterministicShuffle}
(S_s,stageId,seed,algorithmVersion).
$$

The same canonical inputs must produce the same permutation.

This randomization is used to prevent submission order, database order, creation order, or identifier order from determining the initial pair schedule.

The randomization is **not** a ranking and does not represent a model estimate of submission quality.

No Bradley–Terry parameter, early win rate, or preliminary ranking may influence this initial permutation.

---

## 6.3 Initial Pair Generation

The first comparison schedule is generated from the randomized submission population, before a Bradley–Terry model is available.

The initial schedule must provide broad evidence coverage rather than preferentially selecting submissions using an uninitialized model.

The initial pair generator must:

* never pair a submission with itself;
* generate only pairs from the stage's input population;
* respect any configured comparison/replication budget;
* preserve deterministic behavior for identical inputs and seed;
* provide comparison-graph coverage sufficient for the configured initial judging stage;
* avoid using Bradley–Terry rankings or scores that do not yet exist.

Where the pairwise stage requires a connected comparison graph, the initial schedule must ensure that the generated comparison graph is connected whenever that is mathematically feasible.

Let:

$$
G_P=(V,E)
$$

where each submission is a vertex and each judged comparison contributes an edge between the two compared submissions.

For a connected graph over \(N_s\) submissions:

$$
|E|\ge N_s-1.
$$

This is a necessary connectivity condition, not a sufficient condition for the final statistical quality of the schedule.

The initial scheduler may add additional comparisons according to the configured evidence budget and replication requirements.

---

## 6.4 Initial Pair Assignment to Judges

After initial comparison units are generated, the common Assignment Engine assigns those comparison units to eligible judges.

The scheduler must account for:

* judge eligibility;
* track eligibility where applicable;
* configured comparison replication;
* judge capacity;
* workload parity;
* deterministic seed-based assignment;
* duplicate assignment prevention;
* required comparison-graph coverage.

If \(Q_s\) is the number of initial comparison assignments to judges, the target workload is:

$$
q=\left\lfloor\frac{Q_s}{J_s}\right\rfloor
$$

and:

$$
e=Q_s\bmod J_s.
$$

Exactly \(e\) active judges receive \(q+1\) comparison assignments and the remaining judges receive \(q\), whenever the configured constraints permit this distribution.

Therefore:

$$
\max(load)-\min(load)\le1.
$$

The workload formula here is intentionally expressed in **comparison assignments**, not submission reviews, because pairwise judging has a different assignment unit from rubric judging.

---

## 6.5 Human Evidence and Model Activation

The system records each submitted pairwise outcome as immutable evidence.

Only after human outcomes exist does the Bradley–Terry model become eligible to drive adaptive scheduling.

The model consumes the completed pairwise outcomes from the current stage and estimates relative submission strengths.

A pairwise stage must therefore never execute this invalid sequence:

```text
Submissions
    ↓
Bradley–Terry
    ↓
Initial ranking
    ↓
Initial pair selection
```

The valid sequence is:

```text
Submissions
    ↓
Deterministic randomization
    ↓
Initial coverage comparisons
    ↓
Human outcomes
    ↓
Bradley–Terry
    ↓
Adaptive pair selection
```

---

## 6.6 Adaptive Pair Selection

After the initial evidence has been collected, the pairwise engine may enter adaptive scheduling.

The adaptive scheduler uses the current Bradley–Terry estimates, uncertainty, advancement-boundary relevance, information value, evidence balancing, and connectivity protection to select additional comparisons.

For candidate pair \((i,j)\), the protected priority is:

$$
P_{ij}
=
0.40S_{ij}
+
0.30B_{ij}
+
0.20I_{ij}
+
0.10E_{ij}.
$$

Where:

$$
S_i=
\max
\left(
0,
\theta_i+1.96SE_i-\theta_K
\right)
$$

and:

$$
S_{ij}=\frac{S_i+S_j}{2}.
$$

Boundary relevance is:

$$
B_i
=
\exp
\left(
-\frac{|\theta_i-\theta_K|}
{\operatorname{median}(SE)}
\right)
$$

and:

$$
B_{ij}=\frac{B_i+B_j}{2}.
$$

Information value is:

$$
I_{ij}=4p_{ij}(1-p_{ij}).
$$

Evidence balancing is:

$$
E_{ij}=\frac{1}{1+C_i+C_j}.
$$

Here \(C_i\) and \(C_j\) represent the accumulated comparison evidence for the candidate submissions under the configured counting rule.

The adaptive scheduler must not use the model to erase the need for exploration. If adaptive selection would disconnect the comparison graph, connectivity protection overrides normal priority selection.

Adaptive scheduling is therefore **protected exploration**, not simply “compare the currently highest-ranked submissions.”

---

## 6.7 Adaptive Assignment to Judges

Selected adaptive comparisons are converted into assignment units:

$$
comparison(A,B)\times judge.
$$

They are then passed through the same common Assignment Engine used for initial pair assignments.

The common engine revalidates:

* judge eligibility;
* track eligibility;
* capacity;
* workload balance;
* duplicate constraints;
* stage isolation;
* deterministic assignment;
* connectivity requirements.

Adaptive assignments are versioned separately from earlier assignment decisions so that the system can audit which comparisons were generated during which scheduling iteration.

A new assignment version must never mutate previously submitted pairwise evidence.

---

## 6.8 Bradley–Terry Refit Loop

After additional adaptive comparisons are completed, the system refits the Bradley–Terry model using the complete immutable evidence set available to that stage.

The loop is:

$$
\text{Initial evidence}
\rightarrow
\text{BT fit}
\rightarrow
\text{Adaptive selection}
\rightarrow
\text{new evidence}
\rightarrow
\text{BT refit}
$$

and may repeat until the configured stopping condition is satisfied.

The model remains stage-local:

$$
\theta^{(s)}
$$

is never silently transferred into another stage or converted into a rubric score.

---

## 6.9 Pairwise Stopping Conditions

A pairwise stage may stop when its configured evidence or advancement condition has been satisfied.

For an exact advancement boundary \(K_s\), define:

$$
\Delta_{K_s}
=
\theta_{K_s}-\theta_{K_s+1}.
$$

Boundary stability is satisfied when:

$$
\Delta_{K_s}
>
1.96
\sqrt{
SE_{K_s}^2+SE_{K_s+1}^2
}.
$$

If the configured comparison budget is exhausted before the boundary becomes stable:

```text
SHORTLIST_BOUNDARY_UNCERTAIN
```

is recorded.

The configured fallback selection uses the model estimate and deterministic SHA-256 tie resolution.

The adaptive loop must also stop when:

* the configured comparison budget is exhausted;
* the configured advancement condition is satisfied;
* no feasible comparison remains under the hard constraints;
* the organizer explicitly finalizes the stage under the documented fallback state.

A failure to obtain the required evidence must never be silently represented as statistically certain.

---

# 7. Bradley–Terry Model

For a pairwise stage, the probability that submission \(i\) defeats submission \(j\) is:

$$
P(i\succ j)
=
\frac{e^{\theta_i}}
{e^{\theta_i}+e^{\theta_j}}
=
\frac{1}{1+e^{-(\theta_i-\theta_j)}}.
$$

The system estimates relative submission strength using a regularized Bradley–Terry model.

The objective is:

$$
\max_{\boldsymbol{\theta}}
\left[
\sum_{(i\succ j)}
\log
\left(
\frac{1}{1+e^{-(\theta_i-\theta_j)}}
\right)
-
\lambda
\sum_{k=1}^{N_s}\theta_k^2
\right]
$$

subject to:

$$
\sum_k\theta_k=0.
$$

The configured implementation uses:

$$
\lambda=0.1.
$$

The \(L_2\) penalty prevents infinite latent estimates when a submission wins or loses all of its observed comparisons.

The resulting \(\theta\) values are **stage-local relative strengths**.

They are never treated as rubric scores.

---

# PART III — TYPE 1 RUBRIC ASSIGNMENT ENGINE

# 10. Rubric Stage

When a Type 1 stage uses `RUBRIC`, the stage receives its configured input population \(N_s\).

The total number of assignments is:

$$
A_s=N_sR_s.
$$

The assignment engine must assign exactly \(R_s\) distinct judges to every submission.

---

# 11. Rubric Workload Assignment

Define:

$$
baseQuota
=
\left\lfloor
\frac{N_sR_s}{J_s}
\right\rfloor
$$

and:

$$
extra
=
(N_sR_s)\bmod J_s.
$$

Exactly `extra` judges receive:

$$
baseQuota+1
$$

and all remaining judges receive:

$$
baseQuota.
$$

Thus:

$$
\max(load)-\min(load)\le1.
$$

---

# 12. Rubric Overlap Optimization

For judges \(i,j\), let:

$$
O_{ij}
$$

be the number of submissions evaluated by both judges.

The theoretical average pair overlap is:

$$
P
=
\frac{
N_s\binom{R_s}{2}
}{
\binom{J_s}{2}
}.
$$

The assignment objective is:

$$
PairLoss
=
\sum_{i<j}
(O_{ij}-P)^2.
$$

The engine uses deterministic greedy construction followed by deterministic local improvement.

The optimization must preserve:

* exact review count;
* distinct judges per submission;
* workload parity;
* eligibility;
* required judge-overlap connectivity.

The objective is **balanced and useful overlap**, not the impossible requirement that every judge pair necessarily receive exactly the same number of shared submissions.

---

# 13. Rubric Scoring

For submission \(s\), judge \(j\), and criterion \(c\):

$$
r(s,j)
=
100
\sum_c
w_c
\frac{
score(s,j,c)
}{
max_c
}
$$

where:

$$
\sum_c w_c=1.
$$

Therefore:

$$
0\le r(s,j)\le100.
$$

Raw scores are immutable.

---

# 14. WLS Judge Calibration

Assume:

$$
r(s,j)
=
\theta_s+b_j+\epsilon_{s,j}.
$$

For judges \(i,j\), let \(\omega_{ij}\) be the number of shared submissions.

Their mean score difference is:

$$
\bar d_{ij}
=
\frac{1}{\omega_{ij}}
\sum_{s\in Shared(i,j)}
(r(s,i)-r(s,j)).
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
\sum_jb_j=0.
$$

If review noise is independent and homoscedastic:

$$
\operatorname{Var}(r(s,i)-r(s,j))
=
2\sigma^2.
$$

Therefore:

$$
\operatorname{Var}(\bar d_{ij})
=
\frac{2\sigma^2}{\omega_{ij}}.
$$

Inverse variance weighting gives:

$$
w_{ij}
\propto
\omega_{ij}.
$$

Thus overlap count is the appropriate WLS edge weight under the stated model.

Every edge with:

$$
\omega_{ij}\ge1
$$

is valid evidence and must not be discarded merely because its overlap count is one.

---

# 15. Rubric Normalization

For judge \(j\):

$$
n(s,j)=r(s,j)-b_j.
$$

The aggregate score is first calculated without clamping:

$$
F_{\text{raw}}(s)
=
\frac1{R_s}
\sum_j n(s,j).
$$

The published score is clamped exactly once:

$$
F_s
=
\min(100,\max(0,F_{\text{raw}}(s))).
$$

Ranking uses:

$$
F_{\text{raw}}(s)
$$

rather than the displayed clamped value.

Therefore two submissions whose published values are both \(100\) can still have different internal rankings.

---

# 16. Rubric Disagreement

Judge disagreement is measured using:

$$
SD_s
=
\sqrt{
\frac{
\sum_j(n(s,j)-F_{\text{raw}}(s))^2
}{
R_s-1
}
}.
$$

High disagreement generates an audit signal.

It does not automatically reduce the submission's score.

---

# PART IV — TYPE 2: MULTI-TRACK COMPETITIONS

# 17. Type 2 Definition

In Type 2, submissions are divided into tracks.

For example:

```text
Track A
Track B
Track C
```

Each track is an independent judging universe until an explicitly configured overall stage is introduced.

The organizer determines which judges may work on which tracks.

A judge may be eligible for:

```text
Track A
Track C
```

without being eligible for Track B.

---

# 18. Judge-to-Track Assignment

Track assignment is organizer-controlled.

The organizer explicitly selects:

```text
Judge 1 → Track A
Judge 2 → Track A, Track C
Judge 3 → Track B
Judge 4 → Track A, Track B
```

The assignment engine does **not** automatically invent track eligibility.

Once eligibility is configured:

$$
Eligible(j)
$$

defines the set of tracks judge \(j\) may receive.

For a submission \(s\) belonging to track \(t\):

$$
t\notin Eligible(j)
\implies
j\text{ cannot receive }s.
$$

This rule is mandatory.

---

# 19. Track Isolation

For every track \(t\):

```text
Track t submissions
        │
        ▼
Eligible track judges
        │
        ▼
Track assignment
        │
        ▼
Track judging
        │
        ▼
Track calibration
        │
        ▼
Track ranklist
```

A judge must not receive submissions from a track outside their configured eligibility.

The UI and backend must both enforce this restriction.

UI filtering alone is insufficient.

The backend must reject unauthorized track assignments and unauthorized review access.

---

# 20. Track Assignment Mathematics

For each track \(t\), define:

* \(N_t\) = submissions in track \(t\);
* \(J_t\) = eligible judges assigned to track \(t\);
* \(R_t\) = required reviews per submission.

Then:

$$
A_t=N_tR_t.
$$

The same feasibility rules apply independently within the track.

Judge workloads are balanced within the track subject to the configured eligibility.

The overlap objective is also evaluated within the track:

$$
P_t
=
\frac{
N_t\binom{R_t}{2}
}{
\binom{J_t}{2}
}
$$

and:

$$
PairLoss_t
=
\sum_{i<j}
(O_{ij,t}-P_t)^2.
$$

Therefore the assignment engine deliberately creates strong overlap evidence **inside each track**.

A fixture may incidentally create overlap relationships between judges who are assigned to different tracks, but cross-track connectivity is **not a mandatory invariant**.

Cross-track connectivity is required only if the organizer explicitly configures a single global calibration model that mathematically depends on such connectivity.

---

# 21. Track Calibration

If a track uses rubric judging, WLS calibration is performed within the track's eligible judging universe.

For track \(t\):

$$
\sum_{j\in J_t}b_{j,t}=0.
$$

Track \(t\)'s normalized score is:

$$
F_{t,\text{raw}}(s)
=
\frac1{R_t}
\sum_{j\in J_t}
(r(s,j)-b_{j,t}).
$$

Track rankings are generated from that track's calibrated evidence.

There is no automatic cross-track normalization.

---

# 22. Critical Track Ranking Rule

Track rank is **not** global rank.

If:

```text
Track A = 100 submissions
Track C = 10 submissions
```

then:

```text
A #10
```

is not automatically weaker than:

```text
C #2
```

and:

```text
Track size ≠ submission quality.
```

The number of submissions in a track may affect workload and candidate representation, but it must not be interpreted as evidence that the track contains stronger or weaker projects.

Therefore the system must never use:

$$
rank_t
$$

as if it were a globally calibrated score.

---

# PART V — TYPE 2 OUTPUTS

# 23. Track Winners

If the organizer configures:

```text
TRACK_WINNERS
```

the competition can terminate after track judging.

Each track produces its own ranklist:

$$
RankList_t.
$$

Track winners are selected according to the organizer's configured winner count/rule.

The ranking is entirely within that track's calibrated judging universe.

---

# 24. Overall Winners

If the organizer configures:

```text
OVERALL_WINNERS
```

or:

```text
TRACK_AND_OVERALL_WINNERS
```

the system must create an explicit overall comparison mechanism.

There are two supported architectural modes.

# 25. Overall Calibration — Data-Driven Decision

For Type 2 competitions, global calibration is **not an organizer-configured option**.

After track judging and track-specific normalization are complete, the system evaluates the **actual completed judging data** to determine whether a single global calibration model is statistically supportable.

The system constructs the relevant judge-overlap graph from the completed judging assignments:

$$
G_J=(J,E)
$$

where:

* \(J\) is the set of judges participating in the relevant calibration universe.
* An edge \((i,j)\in E\) exists when judges \(i\) and \(j\) have jointly judged at least one submission.

The system checks whether:

$$
C(G_J)=1.
$$

However, **connectivity alone is not sufficient**. The system must also verify that the available shared evidence is sufficient for the configured calibration model.

If the completed judging structure provides sufficient connected evidence, the system runs a **single global WLS calibration** across the relevant judges and submissions.

The global calibration is therefore derived from the actual judging data rather than from an organizer declaration.

Conceptually:

```text
                    Track Judging
                         │
                         ▼
               Completed Judging Data
                         │
                         ▼
             Build Global Overlap Graph
                         │
                         ▼
              Check Calibration Support
                         │
                ┌────────┴────────┐
                │                 │
             Sufficient         Insufficient
                │                 │
                ▼                 ▼
        Global WLS Calibration   No Global
                │                Calibration
                ▼                 │
        Global Normalization      │
                │                 │
                └────────┬────────┘
                         ▼
                 Overall Processing
```

When global calibration is supported, the system does **not** simply relabel the track-normalized scores as global scores.

Instead, it uses the raw rubric evidence from the relevant submissions and judges to estimate one common judge-offset model:

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
\sum_j b_j=0.
$$

The resulting offsets are applied to the relevant raw rubric evaluations:

$$
n(s,j)=r(s,j)-b_j.
$$

The overall score is then calculated from the globally calibrated evidence:

$$
F_{\text{global,raw}}(s)
=
\frac{1}{R_s}
\sum_j n(s,j).
$$

Overall ranking uses the full-precision global score.

The important distinction is:

$$
\boxed{
\text{Track calibration} \neq \text{Global calibration}
}
$$

Track-specific offsets are estimated within their respective track judging structures. A global calibration, when supported by the actual overlap data, is a **new calibration computation over the global evidence**.

The system must record:

* the judges included in the global calibration universe;
* the submissions included;
* the completed assignment graph;
* judge-overlap counts;
* connectivity result;
* calibration feasibility checks;
* WLS solution;
* calibration algorithm version;
* final global scores;
* final ranking;
* audit/hash information.

If the required global evidence is not present, the system must **not claim that global calibration occurred**.

---

# 26. When Global Calibration Is Not Supported

If the completed track judging data does not provide sufficient evidence for a single connected global calibration model, track-normalized scores must **not** be directly compared to produce overall winners.

In particular:

$$
F_A(s)
\not\equiv
F_B(s)
$$

merely because both scores are numerically represented on the same \(0\)-\(100\) scale.

Instead, the system constructs an **overall candidate pool** from the track ranklists.

The candidate-selection policy determines how many submissions each track contributes.

For example:

```text
Track A Ranklist ──┐
Track B Ranklist ──┼──► Overall Candidate Pool
Track C Ranklist ──┘
                         │
                         ▼
                  New Overall Panel
                         │
                         ▼
                  Fresh Judging
                         │
                         ▼
                  Overall Results
```

The overall judging stage is a **fresh judging stage**.

Track-normalized scores are used only for **candidate selection**.

They do not become the candidate's overall score.

Therefore:

$$
\boxed{
\text{Track scores select candidates;}
\quad
\text{fresh overall judging determines overall scores.}
}
$$

The fresh overall stage may use either configured judging method:

### Rubric Overall Judging

Each selected submission receives the required number of fresh rubric reviews.

The system then performs a new WLS calibration using the overall judging panel:

$$
\min_b
\sum_{i<j}
\omega_{ij}
\left[
(b_i-b_j)-\bar d_{ij}
\right]^2
$$

with:

$$
\sum_jb_j=0.
$$

The resulting calibrated scores determine the overall ranking.

### Pairwise Overall Judging

The selected submissions receive fresh pairwise comparisons.

The system builds a new Bradley–Terry model:

$$
P(i\succ j)
=
\frac{e^{\theta_i}}
{e^{\theta_i}+e^{\theta_j}}.
$$

The resulting model estimates determine the overall ranking.

The overall judging data is independent evidence. Track scores are not carried into the numerical overall score.

---

# 27. Overall Candidate Selection

The candidate selection policy must be explicit.

The system must not assume:

```text
Top 1 from every track
```

or:

```text
Top 10% from every track
```

unless the organizer configured that rule.

Supported policy concepts may include:

### Fixed Per-Track

Each track contributes a configured number:

$$
K_t=K
$$

for every track.

### Proportional

Candidate capacity is distributed according to track population:

$$
K_t
\approx
M
\frac{N_t}{\sum_uN_u}
$$

where \(M\) is total overall candidate capacity.

### Hybrid

Each track receives a minimum candidate count and the remaining capacity is distributed proportionally.

The policy must be deterministic.

The purpose of candidate selection is representation, not to infer quality from track size.

---

# 28. Overall Judging Is a Fresh Stage

The overall stage has its own:

* judge panel;
* required review count;
* assignment;
* workload balancing;
* overlap requirements;
* judging method;
* calibration;
* ranking;
* audit record.

For example:

```text
Track Stage
    │
    ▼
Track Ranklists
    │
    ▼
Candidate Selection
    │
    ▼
Overall Stage
    │
    ├── PAIRWISE
    │      └── Bradley–Terry
    │
    └── RUBRIC
           └── WLS Calibration
    │
    ▼
Overall Results
```

No track score is silently carried into the numerical overall score.

---

# PART VI — PAIRWISE AND RUBRIC ARE REUSABLE STAGE METHODS

# 29. Method Selection

The organizer may configure any stage as:

```text
PAIRWISE
```

or:

```text
RUBRIC
```

The platform must not infer the method from the stage number.

Therefore:

```text
Stage 1 ≠ automatically Pairwise
Stage 2 ≠ automatically Rubric
```

The configured stage definition is authoritative.

---

# 30. Multiple Judging Stages

For \(S\) configured stages:

$$
s\in\{1,2,\ldots,S\}.
$$

Each stage has its own:

$$
N_s,\ J_s,\ R_s,\ method_s.
$$

For every stage:

$$
A_s=N_sR_s
$$

for rubric/review-style assignments, while pairwise stages use their configured comparison budget and assignment structure.

A later stage can receive:

* all previous submissions;
* an explicitly configured advancement set;
* a configured candidate pool;
* track-derived candidates;
* overall candidates.

The system must never assume that every stage reduces the population.

---

# PART VII — SECURITY, ATTACK RESISTANCE & AUDITABILITY

# 31. Extreme Judge Behavior

A judge who systematically scores one project unusually high and competitors unusually low can produce large observed score differences.

WLS calibration estimates the judge's relative offset from overlapping evidence.

The system records audit indicators such as:

```text
EXTREME_OFFSET
COMPRESSED_RANGE
HIGH_DISAGREEMENT
```

These indicators trigger investigation but do not automatically alter raw evidence.

The WLS model is a calibration mechanism, not a guarantee that malicious behavior is perfectly eliminated.

---

# 32. Unlucky Pairings

For pairwise judging, a submission can obtain misleading evidence if it initially faces unusually weak or strong opponents.

The Bradley–Terry model accounts for opponent strength.

Protected exploration can additionally prioritize comparisons near an advancement boundary.

This reduces the dependence of advancement on a small number of lucky pairings.

---

# 33. Track Selection Risk

A track's population size must not be treated as a quality indicator.

The system therefore prevents:

```text
Track size → assumed quality
Track rank → global rank
Track score → global score
```

For overall judging, candidate construction must be explicit and sufficiently representative.

Where no global calibration exists, a fresh overall judging panel provides the actual cross-track comparison.

---

# 34. Judge Dropout

If a judge becomes unavailable:

1. completed valid reviews remain immutable;
2. unfinished assignments are identified;
3. remaining eligible judges are evaluated for replacement capacity;
4. replacement assignments are generated deterministically;
5. duplicate judge/submission assignments are prohibited;
6. workload parity is revalidated;
7. track eligibility is revalidated;
8. required overlap connectivity is revalidated.

If a required single calibration graph becomes disconnected, the system must fail closed.

It must **not** silently replace one global calibration model with disconnected component-wise calibration unless the organizer explicitly configured component-wise calibration as a valid judging model.

---

# 35. Exact Tie Resolution

If two final internal scores are exactly equal at full precision:

$$
F_{\text{raw}}(A)=F_{\text{raw}}(B)
$$

the deterministic tie key is:

$$
tieKey=
SHA256(
canonicalEncode(
competitionId,
judgingVersion,
submissionId
)
).
$$

The tie key is ordered lexicographically by its byte sequence.

This guarantees deterministic tie resolution without database ordering or unseeded randomness.

---

# PART VIII — FINALIZATION & AUDIT SNAPSHOT

# 36. Finalization Record

Every finalized judging process stores an immutable snapshot:

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

---

# 37. Final Architectural Rules

The following rules are mandatory:

1. **There are two competition types:**

   * Type 1 — no tracks;
   * Type 2 — multi-track.

2. **Judging stages are configurable.**

3. **Pairwise and Rubric are stage methods, not fixed phases.**

4. **The organizer configures:**

   * number of judges;
   * number of reviews;
   * number of stages;
   * method for each stage.

5. **Every stage performs feasibility validation before assignment.**

6. **Every submission receives the configured number of distinct judges when feasible.**

7. **Workload difference is at most one when the configured constraints are feasible.**

8. **Rubric calibration requires a connected judge-overlap graph.**

9. **Track judging is isolated by track.**

10. **Judge-to-track eligibility is explicitly configured by the organizer.**

11. **A judge may belong to multiple tracks.**

12. **A judge cannot receive a submission outside their configured track eligibility.**

13. **Track overlap optimization uses the same mathematical assignment principles as global assignment, constrained to each track's eligible judge pool.**

14. **Cross-track judge connectivity is not required unless a single global calibration model is explicitly configured.**

15. **Track rank is not global rank.**

16. **Track population is not a quality signal.**

17. **Track-normalized scores must not be directly compared across tracks without an explicitly configured global calibration/comparison mechanism.**

18. **Global calibration is determined from completed judging evidence; it is not enabled merely because an organizer declares it. If the completed evidence is connected and sufficient for the configured calibration model, the system may perform the global calibration required for overall comparison.**

19. **If global calibration is not statistically supported by the completed evidence, sufficient candidates are selected from each track ranklist and evaluated by a fresh overall judging panel.**

20. **The fresh overall panel uses fresh judging evidence.**

21. **Overall judging may itself be Pairwise or Rubric according to organizer configuration.**

22. **Track scores are not silently reused as overall scores.**

23. **Raw evidence is immutable.**

24. **Algorithmic output is deterministic given identical inputs, configuration, algorithm version, and seed.**

25. **Invalid or statistically unsupported configurations fail closed rather than silently degrading the judging model.**

---

# 38. Core Design Principle

The platform is therefore not:

```text
Phase 1 = Pairwise
Phase 2 = Rubric
```

It is:

```text
COMPETITION
    │
    ├── TYPE 1: NO TRACKS
    │       │
    │       └── CONFIGURED STAGES
    │              ├── Pairwise or Rubric
    │              ├── Assignment
    │              ├── Judging
    │              └── Configured Advancement
    │
    └── TYPE 2: TRACKS
            │
            ├── Organizer-defined Judge ↔ Track eligibility
            │
            ├── Independent Track Assignment
            │
            ├── Independent Track Judging
            │
            ├── Track Ranklists
            │
            ├── Track Winners (if configured)
            │
            └── Overall Stage (if configured)
                    │
                    ├── Global Calibration
                    │       OR
                    │
                    └── Track Candidate Selection
                            │
                            ▼
                       Fresh Overall Panel
                            │
                            ▼
                      Overall Judging
                            │
                            ▼
                       Overall Winners
```

The assignment architecture is therefore **one reusable core Assignment Engine with method-specific assignment strategies and track-specific eligibility constraints**, rather than separate hard-coded Phase 1 and Phase 2 systems.

For Pairwise specifically, the method strategy is:

```text
PairwiseAssignmentStrategy
    ├── InitialPairStrategy
    │     └── deterministic randomization + coverage
    │
    └── AdaptivePairStrategy
          └── Bradley–Terry + protected exploration
```

Bradley–Terry is the statistical model used by the adaptive pair strategy. It is not the common Assignment Engine itself.
