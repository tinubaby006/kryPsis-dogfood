# DOGFOOD HACKATHON

A self-hosted hackathon platform for managing the complete hackathon lifecycle — from event creation and participant registration to team formation, project submission, and judging.

## Features

* Event creation and administration
* Participant registration and authentication
* Team creation and invitations
* Shared team projects
* Project submission and deadline enforcement
* Project image uploads
* Public project gallery
* Role-based access control
* Configurable hackathon tracks, prizes, and questions
* Extensible judging architecture

## Tech Stack

* **Next.js** — application framework
* **TypeScript** — type safety
* **React** — UI
* **Tailwind CSS** — styling
* **SQLite** — local database
* **Drizzle ORM** — database access
* **Zod** — validation
* **Argon2id** — password hashing
* **Vitest** — unit testing
* **Playwright** — end-to-end testing
* **Docker** — local deployment

## Architecture

DOGFOOD follows a simple layered architecture:

```text
UI
 ↓
Routes / API
 ↓
Authentication & Authorization
 ↓
Business Logic
 ↓
Drizzle ORM
 ↓
SQLite
```

The platform is designed as a single coherent application rather than a collection of separate services.

## Local Development

The project is designed to run locally without external runtime dependencies.

```bash
docker compose up
```

The local environment includes:

* Application
* SQLite database
* Persistent uploaded images
* Database migrations
* Seed data

## Project Structure

```text
app/
components/
lib/
db/
tests/
public/
```

The exact structure may evolve as development progresses.

## Judging

DOGFOOD includes an extensible judging architecture supporting configurable judging stages, judge assignment, scoring, and multi-track judging.

Detailed judging design and mathematics are documented separately in [`JUDGING.md`](JUDGING.md).

## Project Status

DOGFOOD is being developed incrementally, with the core hackathon lifecycle implemented first and advanced judging capabilities built on top of it.

## License

This project is intended to be released under an OSI-approved open-source license.
