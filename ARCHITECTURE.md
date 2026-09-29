# Architecture Overview

## Tech Stack
- **Framework:** Next.js 16.3 (App Router)
- **Database ORM:** Prisma ORM v7
- **Database:** PostgreSQL (Containerized)
- **Authentication:** Better Auth (Server-side session management)
- **Styling:** Tailwind CSS / shadcn UI
- **Deployment:** Docker & docker-compose

## Architectural Decisions
1. **Dockerized PostgreSQL:** The application and database are bundled into a single `docker-compose.yml` file to ensure the application is easily distributable and runs completely offline.
2. **Idempotent Seeding:** `scripts/seed.ts` is invoked safely at startup using `npx prisma migrate deploy` followed by `npm run db:seed`.
3. **API Routing for Checks:** An `/api/submit` endpoint handles automated tests that expect a standard HTTP response rather than standard Next.js form handling.
4. **Environment:** Uses a custom `prisma7.config.ts` which handles Prisma's configuration logic, reading connection strings from `process.env`.
