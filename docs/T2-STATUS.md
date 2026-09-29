# T2 Status

## Current Stage
**C0 — inspect and protect the working T1:** COMPLETED

## Status Summary
- Audited the Next.js and Prisma repository. Models are intact, T1 functions correctly, and fixture data/seeds are preserved idempotently.
- Verified Docker/Compose services and provided backup instructions.
- Ran the T1 acceptance runner. 
  - Passes: Gallery public, fixtures shown, closed events refuse submission, judge sees own scores.
  - Fails (Expected for T2): judge cannot see peer scores, participant blocked, csv export works.
- Auth routing and logic need to restrict `/dashboard/judging` which currently returns 200 for unauthorized access.

## Blockers
- None.

## Next Step
**C1 — migrations, local runtime and historical compatibility**
- Add rubric stage lifecycle schema (Stage, RubricVersion, StageProject, etc.)
- Preserve historical fixture reviews without considering them new stage completion.
- Prepare versioned migrations against test database.
