# DOGFOOD HACKATHON

## Product Implementation Plan — Current System Corrections & UX Refinement

### Purpose

This document defines **what needs to change in the current DOGFOOD HACKATHON product**, why each change is necessary, and the priority in which the work should be completed.

It is **not a technical implementation specification**. It should be used as the product/requirements basis for creating the detailed implementation prompt.

The priorities are ordered so that fundamental correctness and broken workflows are addressed before broader UX improvements.

---

# PRIORITY 0 — Critical correctness and broken workflows

These issues should be addressed first because they can prevent an event from being configured or judged correctly, create incorrect access behavior, or leave organizers trapped in an unusable state.

---

## P0.1 — Fix event-scoped roles and access behavior

### Problem

The underlying event model supports event-specific roles, but the current user experience treats roles too globally.

A person may legitimately be:

* Judge in Event A
* Organizer in Event B
* Participant in Event C

but the current dashboard behavior chooses one global role and redirects the user there.

This means a user's role in one event can effectively hide their role in another event.

### Required change

Roles must behave as **event-specific memberships** throughout the product.

A user's role must always be understood in the context of the event they are operating in.

The product must support:

* multiple events for one user
* different roles across different events
* exactly one primary membership role per user within an individual event

The product should not treat Organizer, Judge, or Participant as permanent global identities.

### Why

This is fundamental to the agreed event architecture and prevents conflicts when users participate in multiple hackathons.

---

## P0.2 — Replace the current global dashboard redirect with a My Events dashboard

### Problem

The current `/dashboard` behavior determines a user's "highest" or first available role and sends them to a global role dashboard.

For example, an Organizer in one event may be sent to the Organizer area even when they need to judge another event.

The current audit confirms that there is no unified cross-event workspace.

### Required change

The main dashboard should become a **My Events / My Activity dashboard**.

It should show all events the current user is involved in.

Each event should clearly show:

* event name
* user's role in that event
* relevant pending work
* relevant event status
* relevant next action

Examples:

```text
Event A
Role: Judge
4 reviews pending
[Continue Judging]

Event B
Role: Organizer
Event configuration incomplete
[Manage Event]

Event C
Role: Participant
Submission submitted
[Open Project]
```

The user should choose the event before entering its role-specific workspace.

### Why

This resolves the multi-role/multi-event conflict and creates a consistent entry point for every user.

---

## P0.3 — Make the event creation workflow match the agreed approval model

### Problem

The current system allows event creation only for users who already have a global `canCreateEvents` permission.

Admin approval currently approves the user's ability to create events rather than approving the individual event proposal.

Once permitted, the event can be created directly and the creator immediately becomes its Organizer.

This is different from the agreed product behavior.

### Required change

The intended workflow is:

```text
Authenticated user
        ↓
Create event proposal
        ↓
Pending approval
        ↓
Admin reviews proposal
        ↓
Approved
        ↓
Creator becomes Organizer for that event
```

Any authenticated user should be able to initiate an event proposal.

Approval should apply to the **event proposal**, not grant the user a permanent platform-wide Organizer capability.

### Why

Organizer is an event-level responsibility, not a permanent platform identity.

This also removes the need for the current global "grant organizer access" model.

---

## P0.4 — Enforce one role per user per event

### Problem

The current data model allows the same person to hold more than one event role simultaneously.

The agreed product rule is:

> A user has one membership role within a particular event.

They can have different roles in different events, but not multiple roles within the same event.

### Required change

The product must enforce:

```text
Event A → User → ONE role
```

while still allowing:

```text
Event A → Judge
Event B → Organizer
Event C → Participant
```

### Why

This removes ambiguity about permissions, dashboards, judging eligibility, and participant/organizer behavior.

---

## P0.5 — Fix judge-score access isolation

### Problem

The current audit found that judge-score access can be checked against whether the user is a judge somewhere rather than whether they are a judge for the specific event being requested.

That creates an event-isolation problem.

### Required change

Judge access must always be tied to:

* the specific event
* the specific judging stage where applicable
* the user's legitimate judging role in that event

A Judge in Event A must not gain access to judge information simply because they are a Judge in another event.

Participants must remain blocked from private judging information.

Judges must only see their own permitted judging information and not peer judges' private scores.

### Why

Judging data is private evidence and event boundaries must be respected.

---

# PRIORITY 1 — Make event configuration actually usable

Once the fundamental access model is correct, the next priority is making it possible for an Organizer to configure an event without encountering unnecessary blockers.

---

## P1.1 — Add an explicit "Tracks or No Tracks" choice

### Problem

The current event configuration presents tracks as though they are always part of the workflow.

This creates downstream problems:

* judges are asked to select tracks even when the event has no tracks
* an Organizer may feel forced to create a track
* "Overall" or "Open Innovation" may be added simply to satisfy the UI
* a legitimate no-track event becomes difficult or impossible to configure naturally

### Required change

Event configuration should explicitly ask:

```text
Does this event use tracks?

○ No tracks
○ Multiple tracks
```

### If No Tracks

The event should operate as one global judging pool.

There should be:

* no mandatory track creation
* no track selection when inviting judges
* no fake "Overall" track
* no requirement to create a placeholder track

### If Tracks Are Enabled

The Organizer should then be able to create and manage named tracks.

Only in this mode should judges be associated with eligible tracks.

### Why

A no-track event is a valid judging structure and should be treated as a first-class configuration rather than a special case that happens to work only after creating a fake track.

The judging specification already distinguishes a global no-track pool from multi-track judging.

---

## P1.2 — Separate "Overall Judging" from tracks

### Problem

The current experience can make "Overall" appear to function like a track.

These are conceptually different.

A track represents a judging pool/category.

Overall judging is a separate judging stage or evaluation of finalists across categories.

### Required change

Do not require an Organizer to create an "Overall" track merely to make judging work.

If an event uses overall judging, it should be configured explicitly as overall judging.

If an event has no tracks, it should still be able to conduct judging normally.

### Why

This prevents the event configuration model from confusing categories, judging pools, and final overall evaluation.

---

## P1.3 — Improve event creation date selection

### Problem

The current date input is difficult to use. During testing, the Organizer could not properly access/select the date.

### Required change

The event creation experience should provide an obvious, reliable date-selection interaction for:

* event start date
* event end date
* relevant deadlines where applicable

The Organizer should immediately understand which date is being selected.

Invalid date combinations should produce clear explanations.

### Why

Dates are fundamental event configuration and should not become a usability blocker during event creation.

---

## P1.4 — Make rubric weights Organizer-friendly

### Problem

The current rubric configuration exposes weights on an unnecessarily large scale, making the Organizer deal with values such as thousands or ten-thousands.

This makes a simple weighting task feel unnecessarily complicated.

### Required change

Organizer-facing rubric weights should use a simple **0–100 scale**.

Example:

```text
Innovation              25
Technical Execution     25
Impact                   30
Presentation             20
                         ---
Total                   100
```

The Organizer should see an immediate total:

```text
Total: 100 / 100
```

and should not need to reason about 10,000-point normalization.

### Why

The Organizer is expressing relative importance, not calculating mathematical normalization.

The judging mathematics can still normalize these weights internally; the UI should use the most understandable representation.

---

## P1.5 — Investigate and remove unexplained "Mutable" rubric field

### Problem

The rubric interface currently exposes a `Mutable` field/column that is not understandable to an Organizer.

The Organizer currently sees a technical-looking property without a clear product purpose.

The judging specification establishes that raw judging evidence is immutable after creation, including raw rubric criterion scores and assignment records.

It does not establish that "Mutable" is an Organizer-facing rubric concept.

### Required change

Determine whether `Mutable` has an actual product purpose.

* If it is only implementation/fixture data and has no meaningful Organizer function, remove it from the Organizer interface.
* If it represents a real product capability, replace the unexplained field with clear user-facing terminology and behavior.

The Organizer should only see rubric properties they actually need to configure.

### Why

Technical/internal fields should not appear in a configuration interface without a clear purpose.

---

# PRIORITY 2 — Make judging configuration fail-safe and recoverable

These changes are essential because an Organizer should never reach a valid-looking configuration and then become trapped when the judging assignment cannot be generated.

---

## P2.1 — Validate judge/review feasibility before assignment

### Problem

An Organizer can configure a stage where the number of required reviews per submission is greater than the number of eligible judges.

Example:

```text
Eligible judges: 2
Reviews required per submission: 3
```

The assignment correctly fails, but the problem is discovered too late.

### Required change

The Organizer should receive immediate, clear validation before attempting assignment.

Example:

```text
Cannot assign judges.

3 reviews are required for each submission,
but only 2 eligible judges are available.

Add at least 1 eligible judge
or reduce the required reviews to 2.
```

### Why

The assignment system requires feasible judge capacity. The judging specification explicitly defines assignment counts and rejects configurations when mandatory constraints cannot be satisfied.

The Organizer should understand this before reaching a failed assignment state.

---

## P2.2 — Make failed assignments recoverable

### Problem

When assignment fails, the Organizer can be left in a state where they cannot easily correct the problem.

This was observed directly during testing.

### Required change

A failed assignment should leave the stage editable.

The Organizer should be able to:

* add another judge
* change the number of required reviews
* change eligible judging configuration where appropriate
* retry assignment
* return to stage configuration
* abandon/delete the uncommitted stage where appropriate

### Why

A configuration error should not permanently trap the Organizer.

---

## P2.3 — Allow assignment to be retried after correcting the configuration

### Problem

After adding another judge, the Organizer should be able to return to the stage and attempt assignment again.

The current experience does not make this recovery path sufficiently clear.

### Required change

After correcting the problem:

```text
2 judges
3 reviews
→ impossible

Add judge

3 judges
3 reviews
→ feasible

[Assign Judges]
```

The assignment action should remain available when the stage is in a recoverable, unassigned state.

Refreshing the page should not destroy the ability to continue configuration.

### Why

Organizers should be able to progressively configure an event without rebuilding the entire stage.

---

## P2.4 — Provide explicit stage recovery controls

### Problem

After creating a problematic stage, the Organizer may discover that the configuration cannot be used but has no obvious way to recover.

### Required change

Before judging evidence becomes immutable, the Organizer should have clear options to:

* edit the stage
* retry configuration
* delete an unused/uncommitted stage
* create a replacement stage

The product should distinguish between a **configuration that can still be changed** and **actual judging evidence that must remain immutable**.

The judging specification explicitly requires assignment records and raw judging evidence to remain immutable after creation.

### Why

This gives the Organizer flexibility during setup without compromising judging integrity once actual evidence exists.

---

# PRIORITY 3 — Improve the complete Organizer experience

After the core configuration and recovery problems are solved, the entire Organizer workflow should be made coherent rather than feeling like a collection of disconnected settings pages.

---

## P3.1 — Make event setup feel like one guided workflow

### Problem

The current experience exposes configuration areas without making the overall sequence clear.

The Organizer has to discover the relationship between:

* event details
* tracks
* judges
* stages
* rubrics
* assignments
* judging
* results

### Required change

The Organizer experience should communicate a clear progression:

```text
Event Details
      ↓
Tracks / No Tracks
      ↓
Judges
      ↓
Judging Stages
      ↓
Rubric / Pairwise Configuration
      ↓
Assignment Readiness
      ↓
Judge Assignment
      ↓
Judging
      ↓
Results
```

The Organizer should always understand:

* where they are
* what has been completed
* what remains
* what is preventing the next step
* what can still be changed

### Why

This reduces configuration errors and makes the product usable by an Organizer who is not familiar with the internal judging model.

---

## P3.2 — Improve validation and error messages throughout event setup

### Problem

Some errors are technically detected but not presented in a way that helps the Organizer resolve them.

### Required change

Every important validation error should answer:

1. What is wrong?
2. Why is it wrong?
3. What can I do to fix it?

For example:

```text
Cannot assign judges.

Only 2 eligible judges are available,
but each submission requires 3 reviews.

Add another eligible judge or reduce
the number of required reviews.
```

Avoid generic errors such as:

```text
Assignment failed.
```

### Why

Error detection without recovery guidance still produces a poor workflow.

---

## P3.3 — Make configuration state visible

### Problem

The Organizer can lose track of whether a stage is:

* configured
* ready for assignment
* assigned
* being judged
* completed
* finalized
* published

### Required change

The interface should clearly show the current state of each event/stage and the next available action.

### Why

This makes the event lifecycle understandable and reduces accidental configuration mistakes.

---

# PRIORITY 4 — Fix acceptance-suite compatibility and verification

---

## P4.1 — Resolve the judge-score acceptance failure

### Problem

The acceptance suite currently reports that judges cannot see their own scores.

This needs to be reconciled with the actual product behavior.

### Required change

A Judge must be able to access the judging information they are legitimately entitled to see, while:

* peer judges' private scores remain hidden
* participants cannot access private judge information
* access remains event-specific

### Why

This is explicitly tested by the hackathon acceptance suite and is part of the required judging behavior.

---

## P4.2 — Resolve the CSV acceptance failure

### Problem

The acceptance suite reports that CSV export does not work, but manual testing indicates that CSV export currently works.

Therefore the problem is not necessarily the export feature itself.

### Required change

The product should ensure that the CSV export behavior satisfies the expected acceptance behavior as well as working through the Organizer UI.

The exported data should remain complete and defensible, including the detailed judging information expected from the judging system.

### Why

A feature that works manually but fails the official acceptance check still represents an integration/compatibility problem that must be resolved before considering the feature complete.

---

# PRIORITY 5 — Rework the main dashboard and event navigation

These are important product improvements but should follow the correctness and configuration work above.

---

## P5.1 — Create the unified My Events experience

### Problem

There is currently no unified cross-event dashboard.

### Required change

The main dashboard should show every event the user is involved in, with their role and relevant pending activity.

It should become the user's starting point rather than a role-detection redirect.

---

## P5.2 — Make role-specific workspaces event-specific

### Problem

Organizer and Judge areas currently behave as global role buckets.

### Required change

When a user enters an event, they should enter the workspace appropriate to their role **within that event**.

For example:

```text
Event A → Judge Workspace
Event B → Organizer Workspace
Event C → Participant Workspace
```

The same user should be able to move between these naturally.

---

## P5.3 — Improve Participant experience

### Problem

There is currently no dedicated participant dashboard.

Participants interact through event/project pages instead.

### Required change

Provide a clear event-specific participant workspace showing:

* team/project
* submission status
* relevant deadlines
* submission actions
* published results when applicable

This should be part of the event experience rather than a global Participant identity.

---

# PRIORITY 6 — Admin experience cleanup

---

## P6.1 — Make the Admin dashboard focused on administration

### Problem

The current Admin dashboard displays all users together in a large list.

The audit confirms there is currently no search or filtering.

### Required change

The Admin area should focus on administrative tasks rather than presenting a large unstructured user dump.

The main administrative areas should include:

* event proposals awaiting review
* users
* completed/conducted events
* relevant administrative actions

---

## P6.2 — Improve the Users area

### Problem

Showing every user together becomes difficult to navigate and provides too much unnecessary information.

### Required change

The Users area should provide useful search/filter capabilities, such as:

* user
* event
* role
* relevant account status

Users should not need to scroll through an unfiltered list to find a particular person.

---

# PRIORITY 7 — Final judging/results UX

These improvements should happen after the configuration workflow is stable.

---

## P7.1 — Make results understandable to Organizers

The Organizer should be able to understand:

* which stages are complete
* whether judging is complete
* whether results are ready
* whether results are finalized
* whether results are published

The detailed mathematical machinery should not be exposed unnecessarily in the primary interface.

---

## P7.2 — Keep detailed judging evidence available through export

The public-facing results do not need to expose every judge's internal data.

The detailed stage-level judging information should remain available through the Organizer's export/reporting functionality.

This preserves the distinction between:

```text
Public Results
```

and:

```text
Internal Judging Evidence
```

---

# LATER — Explicitly deferred features

The following should **not be prioritized in the current implementation pass**.

They should be implemented later after the core event, judging, and dashboard workflows are stable.

---

## L1 — Organizer → Judge reminders

Add an Organizer action such as:

```text
Remind Judge
```

which produces a notification to a judge with pending reviews.

This was explicitly deferred and should not become a dependency of the current judging workflow.

---

## L2 — Broader notification system

Later, introduce notifications for events such as:

* event approval
* judge invitation
* invitation acceptance
* judge assignment
* submission deadlines
* judging deadlines
* results publication
* relevant lifecycle reminders

The current product should not depend on an external notification infrastructure to complete the core workflow.

---

## L3 — User profile and history

Later, introduce a user profile/history experience containing relevant cross-event activity such as:

* events participated in
* events organized
* judging history
* projects/submissions
* awards/wins

This is separate from the immediate event workflow.

---

## L4 — Leaderboard

No leaderboard should be added.

This is intentionally outside the product scope.

---

# FINAL PRIORITY ORDER

The implementation should broadly proceed in this order:

```text
P0 — Correctness & access
│
├── Event-scoped role behavior
├── My Events foundation
├── Event proposal/approval model
├── One role per event
└── Event-scoped judging access
        ↓
P1 — Event configuration
│
├── Tracks / No Tracks
├── Separate Overall from Tracks
├── Date selection
├── Rubric weight simplification
└── Remove/clarify Mutable
        ↓
P2 — Judging workflow recovery
│
├── Feasibility validation
├── Failed assignment recovery
├── Retry assignment
└── Stage edit/delete/recovery
        ↓
P3 — Organizer UX
│
├── Guided setup
├── Better validation
└── Visible configuration state
        ↓
P4 — Acceptance compatibility
│
├── Judge-score acceptance failure
└── CSV acceptance failure
        ↓
P5 — Dashboard & event navigation
│
├── My Events
├── Event-specific workspaces
└── Participant workspace
        ↓
P6 — Admin UX
│
├── Admin overview
└── Search/filter users
        ↓
P7 — Results UX
│
└── Clear finalization/results experience
        ↓
LATER
├── Judge reminders
├── Notifications
├── Profile/history
└── No leaderboard
```

# Product principles for the entire implementation

1. **An event without tracks must be a fully valid event.**
2. **Organizers must never be forced to create fake tracks to make judging work.**
3. **A configuration error must be recoverable whenever no immutable judging evidence has yet been created.**
4. **The user should always understand why an action cannot be performed and how to fix it.**
5. **Roles belong to events, not to a user's global identity, except for genuine platform administration.**
6. **The same user must be able to participate in different events with different roles.**
7. **The primary dashboard should represent the user's events and work, not choose one global role for them.**
8. **The Organizer interface should use understandable product concepts rather than exposing unnecessary internal terminology.**
9. **The judging mathematics and evidence integrity must remain protected even while the configuration UX becomes easier.**
10. **Public results and private judging evidence must remain separate.**
11. **The product should fail clearly and recoverably rather than leaving the Organizer trapped in a broken configuration state.**
12. **Features explicitly marked LATER should not become prerequisites for completing the core event and judging workflow.**
