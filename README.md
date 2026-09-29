# Dogfood Hack: Event Platform

Dogfood Hack is a full-featured event and hackathon management platform, designed to facilitate organizer requests, judge provisioning, and participant submissions with a robust Next.js and Prisma architecture.

## Overview & Status

The platform has completed **Stage 5 Extensions** of development, establishing:
- **Organizer Capabilities**: An access-request workflow where prospective organizers apply for event creation capabilities, subject to admin approval or revocation.
- **Judge Provisioning**: Event organizers can invite judges via direct assignments or secure, single-use offline tokens.
- **Roles & Workspaces**: Distinct dashboards and experiences for Participants, Organizers, Judges, and Admins via `WorkspaceLayout`.
- **Public & Private Events**: A dynamic landing page rendering public events and obscuring drafts.
- **T1 Integrity**: The application successfully passes all T1 assertions and correctly enforces submission deadlines based on explicit timezone management.

**T2 Notice**: Actual judging features—including score assignment, rubric definitions, scoring formulas, and normalization algorithms—remain explicitly incomplete. The judge workspaces exist to list granted tracks and demo the infrastructure, but scoring endpoints are reserved for genuine T2 development.

## Setup & Offline Execution

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Demo Accounts

For offline and demo purposes, use these accounts (password is `password` for all):
- **Admin**: `admin@test.com`
- **Organizer**: `organizer@test.com` (can create events)
- **Participant/Applicant**: `hacker@test.com` (can apply for organizer capabilities and submit projects)
- **Judge**: `judge@test.com`

*Note: For the official tests, use `python docs/official/run.py`. Ensure the server is running on port 3000.*
