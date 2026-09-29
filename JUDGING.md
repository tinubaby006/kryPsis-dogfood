# Judging Architecture

Judging is implemented via specific `EventRole` and `AssessmentCredential` assignments. 
Currently, judges can access a dedicated dashboard to evaluate submitted projects.

## Stage 6 State
- Forms and APIs for submitting scores exist and function properly.
- A regression in T2 constraints was consciously retained, meaning that currently:
  - Judges can see scores of other peers.
  - Non-judges (e.g., standard participants) are not explicitly blocked from accessing the judging dashboard route if they attempt to guess the URL.
- These will need to be fixed in the upcoming T2 remediation stage by adding strict Next.js middleware or Server Component guards.
