# Architecture Overview

## Tech Stack
- **Framework:** Next.js 16.3 (App Router)
- **Database ORM:** Prisma ORM v7
- **Database:** PostgreSQL (Containerized)
- **Authentication:** Better Auth (Server-side session management)
- **Styling:** Tailwind CSS / shadcn UI
- **Deployment:** Docker & docker-compose

## Architectural Decisions

1. **Transaction Locking & Concurrency:** All critical judging processes (assignments, submits, closures, and finalizations) enforce strict PostgreSQL transaction boundaries. We acquire row-level locks (`FOR UPDATE`) on Event and JudgingStage rows before modifying RubricAssignments to prevent race conditions during concurrent submissions or drop-outs.
2. **Historical vs. Live Stages:**
   - **Historical Projection:** Manually imported legacy fixture data is strictly partitioned into `origin = FIXTURE` projections. These stages are read-only and explicitly marked with an `UNKNOWN` completion status.
   - **Live Stages:** Fresh events and stages use `origin = LIVE`. Their lifecycles must strictly progress through `DRAFT` ➔ `OPEN` ➔ `CLOSED` ➔ `CALCULATED` ➔ `FINALIZED`.
3. **Algorithm Versioning (`pair_overlap_wls_v3`):** We use a heavily-tested exact Laplacian solve via Gaussian Elimination to normalize judge scoring data and correct biases, entirely offline.
4. **Idempotent Repair & Recovery:** `scripts/repair-fixture-history.ts` and `scripts/seed.ts` use deterministic identity and `upsert` logic, avoiding duplicate runs and preserving data integrity across offline re-deployments.
5. **No Fallback Databases:** The backend refuses to start (fails fast) if `DATABASE_URL` is omitted, eliminating the risk of silently connecting to volatile development databases.
6. **Data Immutability (FinalizationSnapshots):** Calculating results on a closed stage creates a `CalculationRun`. Finalizing it commits an immutable `FinalizationSnapshot` containing the complete JSON evidence of the event. All public CSV exports and gallery routes resolve directly to this snapshot, eliminating state mismatches.
