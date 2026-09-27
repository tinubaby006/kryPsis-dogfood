# Implementation Decisions

This document tracks intentional technical choices made in fulfilling the hackathon requirements where the prompt left ambiguity or invited a decision.

## Stage 0
1. **Next.js Version Restrictions**: Maintained Next.js 16.3.6 and React 19.2.8 as requested in the starter template to honor the 'EXISTING blank Next.js project' boundary, preventing uncontrolled major upgrades.
2. **Postgres & Environment Tools**: Utilizing PostgreSQL 17 in `docker-compose.dev.yml` based on the provided reference block in `T1_IMPLEMENTATION_PLAN.md`.
3. **Execution Environment**: We enforce `.cmd` for `npm` and `npx` locally to maneuver around Windows PowerShell script execution policy errors dynamically.

