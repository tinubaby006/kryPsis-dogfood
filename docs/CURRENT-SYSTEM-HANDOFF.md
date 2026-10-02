# Current System Handoff

**Date**: 2026-10-03
**Status**: All T1 and T2 Core Requirements Completed

## System Architecture Updates
The system has been comprehensively upgraded to support the T2 Tier requirements for the DOGFOOD 2026 challenge.

### Key Changes
1. **Mathematical Calibration**: Implemented `pair_overlap_wls_v3` for precise Laplacian solving of judge biases.
2. **Offline Execution**: Fully isolated offline runtime with Playwright verification matrix, `DATABASE_URL` runtime checks, and self-contained browser/package configurations.
3. **Data Model Integrity**: Established `FinalizationSnapshot` as the single canonical source of truth for public results, decoupled legacy fixtures via `origin = FIXTURE`, and added `TracksMode` (SINGLE_POOL / MULTI_TRACK).
4. **Strict Authorization**: Multi-event scoping securely enforced using isolated transactions.

## Deprecation Notice for Stale Planning Files
The following files reflect historical, legacy planning efforts and are now considered **STALE and SUPERSEDED** by the actual implemented architecture (as documented in `T2-CORRECTION-STATUS.md` and `ARCHITECTURE.md`):

- `docs/SYSTEM-IMPROVEMENTS-PLAN.md`
- `docs/SYSTEM-IMPROVEMENTS-REQUIREMENTS.md`
- `docs/SYSTEM-IMPROVEMENTS-STATUS.md`
- `docs/T1_IMPLEMENTATION_PLAN.md`
- `docs/T1_EXTENSION_AFTER_STAGE_5.md`
- `docs/T2-REVIEWED-PLAN.md`

Please refer exclusively to `README.md`, `ARCHITECTURE.md`, `JUDGING.md`, `DATA-MODEL.md`, `OFFLINE-RUNTIME.md`, and `T2-CORRECTION-STATUS.md` for accurate information on the finalized application logic.

## Procedures

### Database Backup & Restore
Since the app relies on a local PostgreSQL container, you can safely back up and restore data without losing state using `pg_dump` and `pg_restore`.

**Backup Command**:
```bash
docker compose exec db pg_dump -U dogfood -F c dogfood_db > backup.dump
```

**Restore Command**:
```bash
docker compose exec -T db pg_restore -U dogfood -d dogfood_db -1 -c < backup.dump
```
