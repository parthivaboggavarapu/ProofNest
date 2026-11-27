# ProofNest

**Every Purchase, Safely Organized.**

ProofNest is a full-stack web application for personal product-record management. It connects purchase details, invoices, warranties, manuals, return deadlines, maintenance schedules, repair history, and expenses to each product a user owns.

The repository contains the project blueprint, the MongoDB data layer, and an initial Express backend foundation. Product APIs, authentication, file/OCR processing, reminders, AI, and the frontend application are not implemented yet. The documentation in [`docs/`](docs/) remains the intended product/API contract.

## What ProofNest is

People lose invoices in email, paper files, and phone galleries. Return windows expire unnoticed. Repair costs never get totaled. Finding “the laptop invoice” takes too long.

ProofNest is **not** a generic warehouse inventory system, an e-commerce store, or a shared asset CMDB. It is a **personal product history platform**:

- One inventory of products the authenticated user owns.
- Documents attached to those products, not a loose file dump.
- OCR/AI extraction that is **suggested**, then **reviewed and confirmed** by the user.
- Deadlines and reminders derived from confirmed dates, not unverified OCR output.
- Repair history whose expense totals are calculated from stored records.
- An AI assistant that answers only from the user’s own saved records, with citations.

## Core modules

| Module | Purpose |
| --- | --- |
| Personal asset inventory | Create, search, filter, and view the history of owned products |
| Document management and OCR | Upload invoices and related files; extract suggestions; confirm before save |
| Smart deadline calendar | Warranty, return, maintenance, and custom reminders |
| Repair history and cost tracker | Service records and calculated repair spend per product |
| AI product assistant | Natural-language retrieval grounded in the user’s records |

## Technology stack

| Layer | Choice | Status |
| --- | --- | --- |
| Frontend | React (JavaScript) + Tailwind CSS + Vite | Selected |
| Backend | Node.js + Express REST APIs | Selected |
| Database | MongoDB + Mongoose | Selected |
| Auth | JWT access + refresh tokens in httpOnly cookies | Selected |
| File storage | Provider-agnostic interface; local disk in development | Provider TBD |
| OCR | Provider-agnostic `DocumentExtractor` adapter | Provider TBD |
| LLM | Provider-agnostic retrieval + generation adapter | Provider TBD |
| Search | MongoDB queries first; Atlas Search if needed | Decision: no extra vector DB for MVP |

Details and rejected alternatives live in [`docs/20-technical-decisions.md`](docs/20-technical-decisions.md).

## Current repository status

- **Commit 1:** initial README placeholder.
- **Blueprint:** architecture, data model, API contracts, UI/UX, security, team plan, and file map.
- **Implemented foundation:** MongoDB connection/models and an Express health-check server.
- **Not implemented:** feature APIs, authentication, frontend application, and deployed environments.

Do not treat any planned file in [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md) as already implemented.

## Documentation map

Start here:

1. [Documentation index](docs/README.md)
2. [Project overview](docs/01-project-overview.md)
3. [Requirements](docs/03-requirements.md)
4. [System architecture](docs/05-system-architecture.md)
5. [Database design](docs/06-database-design.md)
6. [REST API](docs/07-api-documentation.md)
7. [Frontend architecture](docs/08-frontend-architecture.md)
8. [Backend architecture](docs/09-backend-architecture.md)
9. [AI architecture](docs/10-ai-architecture.md)
10. [Team responsibilities](docs/15-team-responsibilities.md)
11. [Development roadmap](docs/16-development-roadmap.md)
12. [Project file map](PROJECT_FILE_MAP.md)

## Planned layout

```text
proofnest/
  docs/          Implementation-ready blueprint
  frontend/      React + Vite application (Phase 2+)
  backend/       Express API (Phase 2+)
  tests/         Unit, API, integration, and e2e tests
  scripts/       Dev and ops helper scripts
  .github/       CI workflow plans
```

The backend contains the MongoDB layer and Express foundation. The frontend still contains only its README and environment example.

## Local backend setup

1. Copy `backend/.env.example` to `backend/.env` and provide a development `MONGO_URI`.
2. Run `npm install --prefix backend`.
3. Run `npm --prefix backend run dev` or `npm --prefix backend start`.
4. Check `http://localhost:4000/api/health`.

The frontend package and feature APIs are not implemented yet. See [`docs/19-environment-configuration.md`](docs/19-environment-configuration.md) for the planned environment configuration.

## Team

Six proposed roles are defined in [`docs/15-team-responsibilities.md`](docs/15-team-responsibilities.md). Names and assignments require team confirmation.

## License

Not selected. Tracked in the technical decision register.
