# Judging Math Model (WLS Calibration)

The hackathon uses an overlap-count weighted constrained least squares (WLS) algorithm to calibrate subjective bias from the judges, producing normalized scores for projects. This statistical approach attempts to model offsets but cannot claim "guaranteed fairness" or an "unbiased truth."

## 1. Raw Scores
Every criterion in the rubric is scored on a zero-based scale up to its configured `maxScore`. It is assigned a `weightBasisPts` mapping out of 10,000 (total).
The raw contribution of a single criterion is:
$Raw = \frac{Score}{MaxScore} \times \frac{Weight}{10000}$
Multiplying by 100 converts the final weighted sum to a 100-point percentile equivalent.

## 2. Evidence Completeness & Graph Connectivity
We build an undirected graph where nodes are Judges. An edge exists if they both reviewed the same project. 
- **Strict Completeness**: A calculation will only succeed if every project has exactly its required $R$ reviews. A missing review is never treated as a zero.
- **Connectivity**: If the graph is disconnected (multiple separate islands), the mathematical baseline cannot safely compare the islands. In this case, the system returns an `UNSUPPORTED` state and explicitly refuses to publish a fallback raw mean. Disconnected multi-judge calibration is strictly not supported.

## 3. Weighted Constrained WLS Calculation
If the graph is connected, we assume:
$S_{ij} = \mu_i + b_j + \epsilon_{ij}$
where $S_{ij}$ is the raw score, $\mu_i$ is the project's true objective score, and $b_j$ is the judge's subjective bias.

Instead of a naive alternating minimization (which fails to account for uneven review counts accurately), we build a system of linear equations weighting the constraints by the overlap counts ($m_i$). We solve for $\mu_i$ and $b_j$ such that $\sum b_j = 0$ (biases cancel out globally).
The new implementation computes project means directly from the final constrained biases iteratively using an overlap-weighted system.

## 4. Aggregation and Display
- Disagreement (SD): The standard deviation of the calibrated scores for each project, computed using the exact unclamped normalized mean. If $m=1$ (only 1 review), SD is mathematically undefined and recorded as `null`.
- The unclamped normalized score ($\mu_i$) is strictly preserved internally for precise ranking and SD calculations. We clamp/round the results to $[0, 100]$ strictly only for the `displayedMean`.

## 5. Ranking & Versioned Finalization
Ties are deterministically broken using:
1. Normalized Mean (Desc) (Unclamped)
2. Raw Mean (Desc)
3. Cryptographic Tie Hash (SHA256 of `projectId + tieSalt`)

When calculation results are accepted, they are bound to a `FinalizationSnapshot` containing the immutable hashes of the evidence (e.g. `inputHash`, `configHash`). Published outputs will strictly reference this versioned finalization, preventing stale calculations from affecting the published leaderboard.
