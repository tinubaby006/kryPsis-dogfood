# Stage 5A: Current UI and T1 Audit

## 1. Environment and Codebase Inspection
- **package.json**: Next.js 16.3.6 (Turbopack), React 19, Tailwind CSS 4, Prisma 7.10.0, better-auth 1.7.6, Lucide React, Shadcn UI base components.
- **app/ layout**: Standard Next.js App Router structure. `app/layout.tsx` includes global `Navbar`.
- **Route Handlers**: `app/api/auth/[...all]/route.ts` handles Better Auth. `app/api/upload/route.ts` handles asset uploads. `app/api/invites/[token]/accept/route.ts` handles team invite acceptance.
- **Server Services**: Prisma client in `lib/db.ts`, Better Auth configured in `lib/auth.ts`.
- **Prisma Schema**: `prisma/schema.prisma` includes `User`, `Event`, `Team`, `Project`, `Track`, `Prize`, `CustomQuestion`, `EventRole`, etc.
- **Seed/Import Logic**: `scripts/seed.ts` loads `scripts/fixtures.json`, injecting initial events, users, teams, projects, and custom questions.
- **Theme Styles**: Currently uses default Next.js Tailwind configuration (mostly black/white defaults). No explicit branding tokens are currently applied globally.

## 2. Implemented Pages and API Inventory
- **Home (`/`)**: 
  - *Purpose*: Global landing page.
  - *Allowed Roles*: Public.
  - *Data Source*: None currently.
  - *Status*: **Empty**. It currently renders the default `create-next-app` boilerplate HTML.
- **Event Discovery**: Not implemented (should be on `/`).
- **Public Event Page (`/events/[eventId]`)**:
  - *Purpose*: Display event schedule, tracks, prizes, and team creation flow.
  - *Status*: Working. Renders details, blocks team creation if closed.
- **Organizer Dashboard (`/organizer`)**:
  - *Purpose*: List managed events.
  - *Status*: Working.
- **Organizer Event Settings (`/organizer/events/[eventId]`)**:
  - *Purpose*: Configure event details, tracks, custom questions, and prizes.
  - *Status*: Working. Supports adding/deleting items and editing event-level properties.
- **Team Dashboard (`/events/[eventId]/team`)**:
  - *Purpose*: Manage team members and invites.
  - *Status*: Working. Generates invite links.
- **Project Submissions (`/events/[eventId]/team/project`)**:
  - *Purpose*: Form to submit project details, custom answers, and media.
  - *Status*: Working. Supports Draft and Complete statuses. Enforces deadlines.
- **Public Project Gallery (`/events/[eventId]/projects`)**:
  - *Purpose*: List submitted public projects.
  - *Status*: Working. Includes diagnostic duplicate badges for organizers.
- **Project Detail (`/events/[eventId]/projects/[projectId]`)**:
  - *Purpose*: View individual project details.
  - *Status*: Working. Excludes private fields.
- **Judge Workspace (`/events/[eventId]/judge`)**:
  - *Status*: Placeholder only. Unverified.
- **Admin Dashboard (`/admin`)**:
  - *Status*: Basic view of all events/projects implemented.

## 3. Home Page Diagnosis
The root `/` page is completely empty of real data because it is currently rendering the hardcoded default Next.js template (`<main className="flex..."><Image src="/next.svg" /> ... To get started, edit the page.tsx file</main>`). 
It does not contain any database queries, event filters, or authentication gates. It simply hasn't been built yet.

## 4. Date Tracing
- **Prisma Schema**: Stores `startsAt`, `endsAt`, `submissionsOpenAt`, `submissionsCloseAt` as `DateTime @db.Timestamptz`.
- **Query/DTO**: Fetched as native JavaScript `Date` objects via Prisma.
- **UI Formatter**: Displayed primarily using `toLocaleString()` in the browser timezone.
- **Gaps**: There is no explicit Timezone handling or UTC pinning for the user interface. If a user sets a close time, it relies entirely on the server/client localized conversion which can cause mismatches at exact deadline boundaries.

## 5. Local Demo Capture / Visuals
*(Manual verification performed via browser)*
- **Home**: Default Next.js Vercel logo and deployment links.
- **Event Detail**: White background, simple text, standard HTML inputs.
- **Organizer Settings**: A grid of white cards with standard borders. 
- **Participant Dashboard**: Functional table layout.
- **Gallery**: Grid of cards displaying basic metadata. 
- **Overall**: The UI functions perfectly but lacks a cohesive design system, brand identity, or responsive navigation drawer.

## 6. Current Layouts
- **Widths**: Uses `max-w-4xl` or `max-w-7xl` depending on the page.
- **Typefaces**: Default system sans-serif.
- **Colors**: Uses Tailwind's default palette (zinc/blue/red).
- **Responsiveness**: Basic `md:flex` classes in the Navbar, but missing a true mobile drawer.
- **Gaps**: Requires the unified black/red theme specified in Stage 5E.

## 7. T1 Requirement Mapping
- **Authentication**: Working (Better Auth).
- **Five Actor Types**: Working conceptually, but explicit Organizer Application and Judge Provisioning workflows are missing.
- **Configurable Events**: Working.
- **Teams/Invites**: Working.
- **Editable Submissions**: Working.
- **Server-enforced Deadlines**: Working.
- **Public Gallery**: Working.

## 8. Current Event Configuration (Preserve)
Working fields:
- Event Name, Visibility (DRAFT/PUBLIC), Max Team Size, Submissions Close At.
- Custom Tracks (Add/Delete).
- Custom Questions (Text/URL/File, Add/Delete).
- Prizes (Name, Description, Amount, Currency, Add/Delete).
*(Recommendation: Do not replace this logic, only integrate it into the new layout).*

## 9. Schema Additions Needed
1. **OrganizerAccessRequest**: To handle user-to-admin applications for the `canCreateEvents` capability.
2. **EventJudgeAccess** & **EventJudgeAccessTrack**: To handle pending email invitations, confirmations, and track-level scopes for judges.

## 10. Ordered Minimal Change List (Stages 5B–5F)
1. **Stage 5B**: Build the `/` home page. Query all published events (including closed ones). Build the Event card component. Implement timezone-aware date formatting.
2. **Stage 5C**: Add `OrganizerAccessRequest` to Prisma schema. Build `/organizer-access` form for users. Build `/admin/organizer-requests` queue for admins to approve/reject.
3. **Stage 5D**: Add `EventJudgeAccess` to Prisma schema. Build the "Judges" tab in Organizer Settings to invite judges by email. Build the judge acceptance flow.
4. **Stage 5E**: Implement the Black/Red design tokens. Apply Space Grotesk/Inter fonts. Restyle Navbar, Home, Event Pages, and Dashboards to match the premium dark theme.
5. **Stage 5F**: Final QA, regression tests, and documentation updates.
