# Judging Math Model (WLS Calibration)

The hackathon uses an advanced weighted least squares (WLS) algorithm to remove subjective bias from the judges, ensuring fair normalized scores for all projects even when the panel is fragmented.

## 1. Raw Scores
Every criterion in the rubric is scored on a zero-based scale up to its configured `maxScore`. It is assigned a `weightBasisPts` mapping out of 10,000 (total).
The raw contribution of a single criterion is:
$Raw = \frac{Score}{MaxScore} \times \frac{Weight}{10000}$
Multiplying by 100 converts the final weighted sum to a 100-point percentile equivalent.

## 2. Graph Connectivity
We build an undirected graph where nodes are Judges. An edge exists if they both reviewed the same project. If the graph is disconnected (multiple separate islands), it means there is no mathematical baseline to safely compare the islands against each other. In this case, the system drops to a `DISCONNECTED_FALLBACK` (raw means) and alerts the organizer.

## 3. Iterative Bias Calibration (Alternating Minimization)
If the graph is connected, we assume:
$S_{ij} = \mu_i + b_j + \epsilon_{ij}$
where $S_{ij}$ is the raw score, $\mu_i$ is the project's true objective score, and $b_j$ is the judge's subjective bias.

We solve for $\mu_i$ and $b_j$ such that $\sum b_j = 0$ (biases cancel out globally).
We iteratively update:
- $\mu_i \leftarrow \text{mean}(S_{ij} - b_j)$
- $b_j \leftarrow \text{mean}(S_{ij} - \mu_i)$
Then center the biases: $b_j \leftarrow b_j - \bar{b}$.

This continues until the maximum change in any bias is less than $1 \times 10^{-6}$.

## 4. Aggregation and Clamping
- Disagreement (SD): The standard deviation of the calibrated scores for each project. If $m=1$ (only 1 review), SD is mathematically undefined and recorded as `null`.
- The aggregated score ($\mu_i$) is then clamped safely into the bounds of $[0, 100]$. This is specifically done *after* aggregation so extreme mathematical biases (like a judge who scores $-50$ when the true score is $100$) do not truncate early.

## 5. Ranking
Ties are deterministically broken using:
1. Normalized Mean (Desc)
2. Raw Mean (Desc)
3. Project ID (Asc)
