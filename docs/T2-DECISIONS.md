# T2 Decisions

## Reviewed Amendments & Core T2 Scope
1. **Pairwise Boundary Variance:** Use covariance of the difference, not the sum of marginal variances alone. (Note: Pairwise is deferred to optional advanced phases).
2. **Global Calibration:** The organizer decides if overall results are needed. The engine validates if there is sufficient evidence (i.e. overlap). No forced "global calibration" if evidence (e.g. single judge or disjoint sets) does not support it.
3. **Small Panels:** For R=1, or J=1, do not claim successful normalization. An SD with 1 review is null.
4. **Assignment Fallbacks:** Distinguish hard infeasible constraints from greedy construction failure. Do not rewrite completed work.
5. **Connectivity Validation:** Adding new adaptive comparisons doesn't disconnect existing graph; check completed evidence.
6. **Immutable Evidence:** Submitted reviews are final. Drafts are mutable, but once submitted, corrections require separate audited records.
7. **Identity & Scope Rules:**
   - No separate `JudgeUser`. Use `User` with `EventRole`.
   - Judges cannot review their own team's submissions.
   - Stage/Judge/Project uniqueness survives assignment repairs.
   - Public track data doesn't expose private judging data.
8. **Finalization Hash:** Use UTF-8 JSON encoding of ordered array to hash for finalization. It proves reproducibility, not cryptographic signing.

## Repository-Specific Integration Choices
- **Historical Reviews:** T1 uses `Review` and `CriterionScore`. We will preserve the existing historical data. We will add a stage-specific link or final review model for T2 to avoid conflating historical `FIXTURE` reviews with new stage evidence.
- **Date Handling:** `submissionsCloseAt` is distinct from judging dates. Judging can happen after submissions close.
- **Database Backup/Restore Commands (via Discovered Service Names):**
  - **Backup:** `docker compose exec db pg_dump -U dogfood dogfood_db -F c > backup.dump`
  - **Restore:** `docker compose exec -T db pg_restore -U dogfood -d dogfood_db < backup.dump`

## Core T2 vs Optional Advanced Features
**Core T2 (C1-C6):**
- Rubric stage lifecycle, versions, deterministic assignments.
- Private judge workbench (Draft/Submit).
- WLS normalization, ranking, and finalization.
- Organizer progress polling.
- Dropout repair (reassign uncompleted work).
- CSV Exports and audit logs.

**Optional Advanced (A1-A4):**
- Pairwise stages, BT scoring.
- Multi-track candidate selection.
- Adaptive scheduling.
