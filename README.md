# Dogfood 2026 - Krypsis Hackathon Portal

A complete event management and hackathon portal, upgraded to Prisma v7 and Next.js App Router.

## Current Status
- **Stage 6 (Production)** is fully implemented.
- The application is containerized with Docker and `docker-compose`.
- PostgreSQL database is initialized and seeded idempotently on container startup.
- T1 functional constraints are **Verified PASSING**.
- T2 constraints (Authorization) are explicitly preserved as failing for future work.

## Running the Application
1. **Docker Compose:**
   Run `docker compose up -d --build`. This starts the PostgreSQL database and the Next.js application. The database is seeded on startup and the app runs on port `3000`.
   
2. **Local Development:**
   Run `npm run dev` to start the development server.

## Verification
- **T1 Tests:** Ran `python docs/official/run.py .dogfood.toml`. All T1 tests verify correctly.
- **Lint/Typecheck:** Executed `npm run typecheck ; npm run lint`. There are 135 known linting/typing issues (primarily `any` types and unused variables) intentionally preserved as technical debt.
- **T2 Failures:** As instructed, T2 failures related to strict isolation of scores and CSV exports were maintained and documented in `T1_CHECKLIST.md`.

## Known Limitations & Next Steps
- T2 (Role-based access controls for Judges and Organizers) needs strict implementation.
- Overhaul TypeScript `any` typings introduced during rapid prototyping.
