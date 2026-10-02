# DOGFOOD 2026 Platform

An offline-capable, highly resilient hackathon management and judging platform built for the DOGFOOD 2026 challenge (T1 and T2 Tiers). This platform enables organizers to configure events, judging stages, rubric criteria, and tracks while providing judges with an intuitive workbench to assign, review, and score projects. 

The system incorporates robust mathematical normalization using the **exact `pair_overlap_wls_v3` Laplacian solve algorithm** and assignment dropout repair logic—all designed to operate flawlessly without an active internet connection. We explicitly make no claims of "guaranteed fairness" or "unbiased truth"—this system strictly implements statistical calibration of observable bias. We also explicitly do NOT claim completion of T3 or T4 functionality (no pairwise/normalization proof features are claimed).

See our [Five-Minute Demo Video](https://example.com/demo). (Replace with actual link if provided)

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL 16
- **ORM**: [Prisma ORM v7](https://www.prisma.io/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Styling**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (using local fonts for offline capability)
- **Containerization**: Docker & Docker Compose

## 🚀 Running the Project Locally

The project is fully containerized and set up to migrate and seed the database automatically on boot. All you need is Docker! Simply clone the repository and run:

```bash
docker compose up -d --build
```

*(The application will be available at `http://localhost:3000` once the database migrations and seed scripts finish running in the background).*

## 🔑 Test Credentials & Local Accounts

Once the database is seeded via the startup script, you can log in using any of the generated test accounts. **The password for ALL accounts is `dogfood_local_dev`**.

| Role | Email | Description |
| :--- | :--- | :--- |
| **Platform Admin** | `platform_admin@dogfood.local` | Full platform access. Can create events, manage stages, assign judges, and publish results. |
| **Event Organizer** | `assessment_organizer@dogfood.local` | The primary fixture organizer assigned to the main event (`evt_01`). |
| **Demo Judge** | `demo_judge@dogfood.local` | A fresh demo judge for live workflow testing. |
| **Fixture Judges** | `tomas.varga@example.org`, `lena.kovac@example.org`, etc. | Any judge email from `docs/official/fixtures.json`. |
| **Fixture Participants** | `priya1@example.org`, `member1_1@example.org`, etc. | Any participant/team member email from `docs/official/fixtures.json`. |

## 🧪 Testing, Acceptance, & Configuration Regeneration

This project implements all T1 and T2 requirements, tested through a rigorous security matrix (Vitest and Playwright) and strict offline restart procedures. It is packaged with an official Python runner script that performs end-to-end security, API, and algorithmic validation against real local sessions.

> [!NOTE]
> The `.dogfood.toml` file is pre-configured with deterministic session tokens that exactly match the local demo database seeded by Docker. You do not need to regenerate it.

### Verification Suite
You can execute the entire verification suite (typechecks, vitest, playwright, and the Python wrapper) by running the offline Powershell script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-all.ps1
```

Or you can run the strict Python wrapper manually against the local container:
```bash
# Run the strict Python wrapper (verifies outputs and exits non-zero on failure)
python scripts/verify-acceptance.py .dogfood.toml --output acceptance-report.txt
```

## 🏗️ Architecture, Math, & Finalization

- **Math Version**: We explicitly use `pair_overlap_wls_v3`, utilizing a deterministic Gaussian elimination with partial pivoting on a Laplacian matrix.
- **Historical Limitations**: The legacy `FIXTURE` data is cleanly segregated into a read-only historical projection. Historical stages have an `UNKNOWN` completion status and are never silently finalized as live stages. Live calculation tests rely on fresh, deterministic live evidence.
- **Schema & Repair**: Manual fixture history is safely repaired via `scripts/repair-fixture-history.ts` using UPSERTs and deterministic IDs to preserve legacy inputs without corrupting modern tracking.
- **Finalization & Publication**: Stages transition strictly from `DRAFT` to `OPEN` to `CLOSED`. Results must be `CALCULATED` explicitly, then locked via an immutable `FinalizationSnapshot` before they can be `PUBLISHED`.

For details on architecture, data models, offline runtime logic, and the exact judging execution process, see:
- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [DATA-MODEL.md](docs/DATA-MODEL.md)
- [JUDGING.md](docs/JUDGING.md)
- [OFFLINE-RUNTIME.md](docs/OFFLINE-RUNTIME.md)
- [T2-CORRECTION-STATUS.md](docs/T2-CORRECTION-STATUS.md)

## Outstanding Limitations
- T3 and T4 tiers (such as pairwise proof mechanisms and global real-time leaderboards) are not implemented.
- The original fixture data lacks exact submission timestamps; thus, historical records display a null `submittedAt`.
- Single-judge graphs are marked explicitly as `SINGLE_JUDGE_UNCALIBRATED`.
- Any legacy dummy calculations have been quarantined or archived to preserve mathematical integrity.

## License
Open Source Initiative (OSI) compliant. (MIT License - See [LICENSE](LICENSE)).
