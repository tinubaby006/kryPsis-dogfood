# Judging Implementation Status

**Status: Stage 5 completed - Provisioning Layer Only**

## Completed Features
- **Judge Access Provisioning**: Organizers can explicitly provision judge access to their events using emails.
- **Offline Invitations**: When an email is unrecognized, a secure token is generated that can be shared securely offline. This removes the dependency on SMTP or sending fake emails.
- **Confirmation Flow**: Unverified users must be manually confirmed by the event organizer before their `AWAITING_CONFIRMATION` access is elevated to `ACTIVE`.
- **Workspace Navigation**: Judges can view their granted events in the `/dashboard/judging` dashboard.
- **Track Scoping**: Judges are restricted and scoped to specific tracks they were explicitly granted.

## Incomplete Features (Reserved for T2)
The following features are **explicitly missing** from this application because they belong to the genuine T2 implementation scope:
1. **Scoring Formulas**: The logic to calculate points.
2. **Rubric Definitions**: Customizable scoring dimensions.
3. **Normalization**: Any logic to even out harsh vs generous judges.
4. **Peer Secrecy Enforcement in UI**: (Though partially handled, fully functional isolation during active scoring is T2).
5. **CSV Exports**: Exporting the scores is not implemented.

Do not use empty 200 responses to fool the T1/T2 checker. Let the T2 checks fail gracefully until genuinely implemented.
