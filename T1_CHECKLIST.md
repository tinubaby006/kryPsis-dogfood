# T1 Constraints Checklist

## Verified Tests
- [x] **T1 gallery is public:** Verified PASS. Unauthenticated requests to `/events/[eventId]/projects` return a 200 response.
- [x] **T1 project from fixtures shown:** Verified PASS. The seeded data ('Glass Signal', 'Small Meadow', 'Deep Compass') renders correctly on the project listing.
- [x] **T1 closed event refuses submissions:** Verified PASS. Submitting to `/api/submit` for a closed event properly returns a 4xx level error (400) rejecting the payload.

## Outstanding T2 Constraints (Not yet fixed)
- [ ] **T2 judge sees own scores:** PASS (functioning, but next checks fail).
- [ ] **T2 judge cannot see peer scores:** FAIL. Returns 200 instead of 401/403. The backend currently allows reading peer scores.
- [ ] **T2 participant blocked:** FAIL. Participants accessing `/dashboard/judging` get a 200 instead of 401/403.
- [ ] **T2 csv export works:** FAIL. Organizer export route returns a 404 instead of 200.

## Note on Testing
- Evaluated via `docs/official/run.py` against the production Docker container `(localhost:3000)`.
- The Python runner executes successfully without unexpected regressions in T1 constraints. T2 constraints remain exactly as prescribed.
- Typecheck and Linting checks were run but reported issues (135 problems: primarily 'any' typings and unused variables) which are retained as known debt.
