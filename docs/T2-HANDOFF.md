# T2 Handoff

## Final exact startup command
To start the Dogfood platform locally, run:
```bash
npm run dev
```

To run a production build, use:
```bash
npm run build
npm run start
```

## Final exact database reset/seeding command
```bash
npx prisma migrate reset --force
npm run generate-config
```
This will migrate the database, seed it via `scripts/seed.ts` automatically, and generate `.dogfood.toml`.

## Final exact export command
To export the assignments, reviews, diagnostics, or results as an organizer:
```bash
curl "http://127.0.0.1:3000/organizer/events/{eventId}/exports?type=results&stageId={stageId}" \
  -H "Cookie: better-auth.session_token={session_token}" > results.csv
```
For testing with the official runner, the official runner parses `.dogfood.toml` and accesses the export endpoints directly.

## Verifying Offline Packaging
The repository has been modified to run fully locally without external networking:
- Fonts have been integrated without external CDN calls.
- Tailwind and Shadcn UI components use local assets.
- Better Auth configuration supports `http://127.0.0.1:3000`.

## Final Runner Output
The exact final runner output has been committed to `acceptance-report.txt` at the root of the repository. All `T1` and `T2` checks pass.
