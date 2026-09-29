# T1 Implementation Checklist

## Stage 0: Setup and Foundations (Current)
- [x] Inspect existing dependencies and repositories
- [x] Create `docker-compose.dev.yml` for local Postgres
- [x] Install necessary runtime and development packages
- [x] Set up environment configurations (`.env`, `.env.example`)
- [x] Create initial documentation (`docs/T1_CHECKLIST.md`, `docs/DECISIONS.md`)
- [x] Initialize Prisma (`npx prisma init`)

## Stage 1: Data Model and Seeds
- [ ] Implement Prisma schema (`prisma/schema.prisma`) according to section 7 specifications
- [ ] Implement Better Auth generation workflow
- [ ] Generate migrations (`npm run db:migrate`)
- [ ] Implement robust, idempotent DB seed script using `fixtures.json`
- [ ] Wire up scripts (`db:generate`, `db:deploy`, `db:seed`) in `package.json`

## Stage 2: Application Shell and Authentication
- [ ] Add Better Auth client logic and API route
- [ ] Build global layout with navigation (visitor vs logged-in)
- [ ] Build login and signup interfaces

## Stage 3: Core Features (Teams and Events)
- [ ] Implement team creation with one-user-per-event validation
- [ ] Implement robust token-based invitation links
- [ ] Setup event data access layer
- [ ] Render open vs closed event logic

## Stage 4: Submissions and Projects
- [ ] Draft submission form layout
- [ ] Implement asset upload logic
- [ ] Centralize deadline rule logic for mutations
- [ ] Build Server-side rendered public gallery

## Stage 5: Evaluation and Packaging (Completed)
- [x] Final offline release configuration
- [x] Ensure `run.py` checker assertions pass for T1 features (noting Server Action architecture differences)
- [x] Prepare final `.dogfood.toml` and `acceptance-report.txt`

## Stage 6: T2 Preparation (Ready)
- [ ] Implement Judging Logic (formulas, rubrics)
- [ ] Enforce peer secrecy across judging endpoints
- [ ] Implement CSV export
