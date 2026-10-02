# Offline Runtime & Database Configuration

DOGFOOD is designed to support fully offline execution for highly secure or air-gapped environments. This document explains the offline runtime constraints, configuration regeneration, and the test/repair execution topology.

## Offline Runtime vs Provisioning

It is important to distinguish between **runtime** and **provisioning**:
- **Fully Offline Runtime:** Once the application images are built and dependencies (including browser binaries for tests) are installed, the application requires **no internet access**. It uses no remote fonts (only system fonts), no remote authentication services, no `npx` dynamic downloads, and no remote databases.
- **Provisioning Needs Internet:** Do not claim a cold fully offline build succeeds unless its images/dependencies are supplied out-of-band. Running `docker compose build` requires internet access to fetch base images (`node:24-alpine` and `postgres:16-alpine`) and NPM packages.

## Execution of the Offline Release

1. On a machine with internet access, pull images, install dependencies, build the Docker images via `docker-compose.build.yml`, and `docker save` the resulting `dogfood-app:local` image and `postgres:16-alpine` to an archive.
2. Transfer the archive to the offline machine.
3. Use `docker load` to load the images into the local registry.
4. Run `docker compose up -d`. The default `docker-compose.yml` specifies `pull_policy: never` to guarantee no internet pulls are attempted. The container will automatically execute migrations and seeding prior to spinning up Next.js.

## Test & Acceptance Setup (Windows Assessment Script)

For offline environments requiring official validation, a Windows Powershell script `scripts/verify-all.ps1` runs the full matrix of integration and workflow tests:
1. Provisions an isolated integration database locally (`127.0.0.1:5432`)
2. Injects real database credentials (`DATABASE_URL`) to securely start Node scripts without relying on insecure fallbacks.
3. Automatically regenerates the `DOGFOOD_BASE_URL` and specific `.dogfood.toml` installation cookies via `scripts/generate-assessment-config.ts`.
4. Runs Playwright security matrix tests and the `scripts/verify-acceptance.py` strict wrapper against the real running Next.js instance.

## Idempotent Repair & Recovery

- **Seed script (`scripts/seed.ts`)**: Can be run repeatedly. It creates deterministic records but does NOT blindly overwrite legitimate user modifications (e.g. tracks, organizer events).
- **Historical Fixture Repair (`scripts/repair-fixture-history.ts`)**: For upgrading existing or corrupted legacy systems, this script securely quarantines invalid runs, validates existing sources against canonical cryptographic hashes, and gracefully upserts standard historical fixture projections using deterministic deterministic identifiers, without erasing legitimate future live evidence.
- **Fail-Fast Boot**: The `start.sh` wrapper refuses to boot unless `DATABASE_URL` and `BETTER_AUTH_SECRET` are supplied. It applies migrations (`prisma migrate deploy`) and seeds the database before HTTP listening starts, avoiding startup race conditions.
