# Judging Math Model (WLS Calibration)

The hackathon uses an overlap-count weighted constrained least squares (WLS) algorithm to calibrate subjective bias from the judges, producing normalized scores for projects. This statistical approach attempts to model offsets but explicitly **makes no claims of "guaranteed fairness," "normalization proof," or an "unbiased truth."** We do NOT claim T3 or T4 completion.

## 1. Raw Scores
Every criterion in the rubric is scored on a zero-based scale up to its configured `maxScore`. It is assigned a `weightBasisPts` mapping out of 10,000 (total).
The raw contribution of a single criterion is:
$Raw = \frac{Score}{MaxScore} \times \frac{Weight}{10000}$
Multiplying by 100 converts the final weighted sum to a 100-point percentile equivalent.

## 2. Algorithm: `pair_overlap_wls_v3`
We use the exact `pair_overlap_wls_v3` algorithm.
We build an undirected graph where nodes are Judges. An edge exists if they both reviewed the same project. We build a weighted graph Laplacian `L` and vector `q` by adding each shared-project pair once, solving the constrained system with deterministic Gaussian elimination (with partial pivoting).

- **Strict Completeness**: A live calculation will only succeed if every enrolled project has exactly its required $R$ valid final reviews (no active pending). A missing review is never treated as a zero. If $m > R$, it is also an error.
- **Historical Analysis**: Historical legacy fixture stages have an `UNKNOWN` expected coverage and their raw values are passed to the analyzer without enforcing a fixed $R$. However, historical analyses cannot be finalized as a live completed round.
- **Connectivity & Single Judges**: 
  - If the graph is disconnected (multiple separate islands), the mathematical baseline cannot safely compare the islands, resulting in `UNSUPPORTED`. 
  - If there is only one judge observed, it returns `SINGLE_JUDGE_UNCALIBRATED` (offsets are 0).
  - Empty datasets result in `INCOMPLETE_EVIDENCE`.

## 3. Aggregation and Display
- **Disagreement (SD)**: The standard deviation of the calibrated scores for each project, computed using the exact unclamped normalized mean with sample denominator $m-1$. If $m=1$ (only 1 review), SD is mathematically undefined and recorded as `null`. If true SD is 0, it is recorded as `0.00`.
- The unclamped normalized score is strictly preserved internally for precise ranking and SD calculations. We clamp/round the results to $[0, 100]$ strictly only for the `displayedMean`.

## 4. Ranking & Versioned Finalization
Ties are deterministically broken using:
1. Normalized Mean (Desc) (Unclamped, full precision)
2. Cryptographic Tie Hash of UTF-8 JSON `["tie-v3", eventId, stageId, projectId]`

*(Note: secondary tie rules based on raw means or epsilon comparators have been removed.)*

When calculation results are accepted, they are bound to a `FinalizationSnapshot` containing the immutable hashes of the evidence (e.g. `inputHash`, `configHash`). Published outputs will strictly reference this versioned finalization, preventing stale calculations from affecting the published leaderboard.
