# DOGFOOD 2026 Platform

An offline-capable, highly resilient hackathon management and judging platform built for the DOGFOOD 2026 challenge (T2 Tier). This platform enables organizers to configure events, judging stages, rubric criteria, and tracks while providing judges with an intuitive workbench to assign, review, and score projects. 

The system incorporates robust mathematical normalization (Weighted Least Squares), dispute resolution, and assignment dropout repair logic—all designed to operate flawlessly without an active internet connection.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL
- **ORM**: [Prisma ORM v7](https://www.prisma.io/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Styling**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (using local fonts for offline capability)
- **Containerization**: Docker & Docker Compose

## Getting Started

Follow these instructions to set up the platform locally. The application and its services have been explicitly engineered to function reliably even when isolated from external networks.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker & Docker Compose
- Python 3.10+ (optional, for running the official test runner)

### Installation & Setup

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the database:**
   Use Docker Compose to start the isolated PostgreSQL database in the background:
   ```bash
   docker compose up -d db
   ```

3. **Reset and seed the database:**
   Run the following commands to apply migrations, seed the local test database with fixtures, and generate the required offline testing configurations (`.dogfood.toml`):
   ```bash
   npx prisma migrate reset --force
   npm run generate-config
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The platform will now be accessible at [http://localhost:3000](http://localhost:3000).

### 🔑 Test Credentials

Once the database is seeded and the configuration is generated, you can log in using the following test accounts. The password for all accounts is **`dogfoodpassword`**.

| Role | Email | Description |
| :--- | :--- | :--- |
| **Platform Admin** | `new_org@test.com` | Full platform access. Can create events, manage stages, assign judges, and publish results across the platform. |
| **Event Creator (Organizer)** | `new_creator@test.com` | A non-admin organizer who specifically has the `canCreateEvents` permission to create and manage their own events. |
| **Judge** | `new_jdg_a@test.com` | Can view assigned projects, submit scores, and save drafts. |
| **Judge (Peer)** | `new_jdg_b@test.com` | A second judge to demonstrate overlap and WLS calculation. |
| **Participant** | `new_prt@test.com` | Restricted access. Can only view public gallery and published results. |

*(Note: The original fixture users such as `platform_admin@dogfood.local` or `tomas.varga@example.org` are also available in the database with the same password).*

5. **Production Build (Optional):**
   To test the production optimized build, run:
   ```bash
   npm run build
   npm run start
   ```

## 🧪 Testing and Acceptance

This project implements all T1 and T2 requirements. It is packaged with an official runner script that performs end-to-end security, API, and algorithmic validation.

To run the verification suite:
```bash
# Ensure the Next.js server is running (npm run dev or npm run start)
python docs/official/run.py .dogfood.toml
```

An exact final output of this acceptance run has been preserved in `acceptance-report.txt`.

## 📂 Documentation

Detailed implementation and handover documentation can be found in the `/docs` directory:
- `docs/T2-DECISIONS.md`: Explains core algorithm selections and repository integration choices.
- `docs/T2-IMPLEMENTATION-MAP.md`: Highlights exactly how T2 specs map to the underlying Prisma models and frontend interfaces.
- `docs/T2-HANDOFF.md`: Official startup sequences, reset commands, and database export guides.
