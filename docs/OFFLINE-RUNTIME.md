# Offline Runtime & Database Configuration

DOGFOOD is designed to support fully offline execution for highly secure or air-gapped environments. This document explains the offline runtime constraints and the networking topology for local deployments.

## Offline Runtime vs Provisioning

It is important to distinguish between **runtime** and **provisioning**:
- **Fully Offline Runtime:** Once the application images are built and dependencies are installed, the application requires **no internet access**. It uses no remote fonts (only system fonts like `-apple-system`), no remote authentication services (using local Better Auth with credential support), and no remote databases or mail services.
- **Provisioning Needs Internet:** Do not claim a cold fully offline build succeeds unless its images/dependencies are supplied out-of-band. Running `docker build` or `npm install` requires internet access to fetch base images (like `node:22-slim` and `postgres:16-alpine`) and NPM packages.

## DATABASE_URL Clarification

The `DATABASE_URL` environment variable controls where the application and Prisma CLI connect to the PostgreSQL database. Its value changes depending on *where* the code is executing:

### 1. Host Network (`localhost` / `127.0.0.1`)
When you are running scripts directly on your host machine (e.g., `npm run dev`, `npm run db:seed`, `npx prisma migrate dev`), you must use the host-level binding.
- **URL Format:** `postgres://user:password@127.0.0.1:5432/dogfood_db`
- **Why?** The Docker Compose file maps the container's port 5432 to the host's `127.0.0.1:5432`, allowing local Node.js processes to reach it.

### 2. Docker Internal Network (`db`)
When the application is running *inside* the Docker container (via `docker compose up`), it runs on an internal Docker bridge network.
- **URL Format:** `postgres://user:password@db:5432/dogfood_db`
- **Why?** Inside the internal Docker network, `localhost` refers to the Next.js container itself. To reach the database, it must use the internal hostname assigned by Docker Compose, which is `db`.

## Idempotent Seed & Health Checks

Our setup includes an idempotent `scripts/seed.ts` that safely preserves organizer changes and only seeds missing fixture data non-destructively.

Additionally, the Docker environment uses **Fail-Fast Health Checks**:
- The startup script uses `set -e`. If a database migration or seed fails, the application container will instantly exit rather than running in a broken state.
- The `app` service has a `curl` health check which ensures Docker only reports the container as healthy when it is genuinely usable and accepting HTTP traffic on port 3000.
