# DOGFOOD 2026: Release Status (R10)

## System Overview
The Dogfood 2026 platform has reached **R10 System-Wide Verification**. The platform is functionally complete for all T1 and T2 requirements, operating robustly in offline or air-gapped environments.

## Features Supported & Verified
1. **Idempotent Offline Provisioning**: Full database, migrations, asset storage, and server configurations spin up from a single `docker compose up` command. All evidence safely persists through container restarts.
2. **Access Control**: Roles (`ORGANIZER`, `JUDGE`, `PARTICIPANT`) strictly adhere to server-side checks. `Better Auth` effectively isolates permissions preventing cross-event judging or unauthorized edits.
3. **Event Configuration (Single-Pool & Multi-Track)**: Organizers can fluidly configure events, assign tracks, and lock rubric parameters. Readiness is completely driven by strict graph connectivity assertions. 
4. **Judging Workbench**: Judges can review assignments, save offline-ready drafts, and submit reviews.
5. **Weighted Least Squares (WLS)**: Fully operational mathematical normalization compensating for judge harshness and leniency.
6. **Immutable Finalization**: Results are cryptographically bound (SHA-256) to their inputs, ensuring no calculation race conditions. Outputs strictly reference canonical data. 
7. **Offline-first Aesthetics**: The black/red dark mode aesthetic works fully offline using local font variants.

## Known Limitations & Unsupported Concepts
- **Disconnected Review Graphs**: WLS mathematics mathematically require judges to overlap. If a group of judges has no shared projects with another group (islands), the algorithm will explicitly output an `UNSUPPORTED` diagnostic state. Disconnected multi-judge calibration is strictly not supported.
- **"Guaranteed Fairness"**: The platform claims statistical calibration of observable bias. It explicitly *removes* all unsupported claims about achieving "unbiased truth" or "perfect fairness".
- **Global Role Entitlements**: Platform-wide organizers/judges do not exist outside `isPlatformAdmin`. All typical roles are bound directly to the Event scope via `EventRole`.

## Matrix Verified
- ✅ **Offline Startup**: Confirmed `docker compose` startup without internet connection.
- ✅ **Data Resilience**: Confirmed evidence persists across hard container restarts.
- ✅ **Type & Build Validation**: Achieved 100% strict `npx tsc` typecheck and `npm run build` optimization.
- ✅ **Workflow Constraints**: Confirmed strict progression through DRAFT -> CONFIGURED -> ASSIGNING -> OPEN -> CALCULATING -> FINALIZED.
- ✅ **Acceptance suite (`run.py`)**: 100% Passing T1 & T2 test vectors.
