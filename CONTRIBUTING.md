# Contributing to ProofNest

ProofNest is developed by a six-member team. Read this before creating branches or pull requests.

## Before you write code

1. Read [`docs/README.md`](docs/README.md).
2. Confirm the module you are changing in [`docs/15-team-responsibilities.md`](docs/15-team-responsibilities.md).
3. Follow the current phase in [`docs/16-development-roadmap.md`](docs/16-development-roadmap.md).
4. Do not implement future enhancements listed in [`docs/23-future-enhancements.md`](docs/23-future-enhancements.md) during MVP.

## Git rules

Full workflow: [`docs/14-git-workflow.md`](docs/14-git-workflow.md).

- Branch from `main` using `feat/`, `fix/`, `docs/`, `chore/`, or `test/`.
- Keep pull requests small and owned by one module when possible.
- Never commit `.env` files, keys, or uploaded documents.
- Never force-push `main`.
- Do not amend published commits.

## Implementation rules that apply to every PR

- Scope every query by the authenticated `userId`.
- Never persist OCR output as verified product or deadline data without an explicit confirm API call.
- Calculate repair totals from stored repair records.
- Keep LLM keys and storage credentials on the server only.
- Add or update tests listed in [`docs/17-testing-strategy.md`](docs/17-testing-strategy.md) for the behavior you change.

## Shared files

Coordinate in the team chat before editing:

- `frontend/src/App.jsx`, routes, layout, design tokens
- `backend/src/app.js`, `server.js`, auth middleware
- Mongoose models
- API response helpers

## Questions

Open a discussion with the Project Lead before changing contracts in:

- [`docs/06-database-design.md`](docs/06-database-design.md)
- [`docs/07-api-documentation.md`](docs/07-api-documentation.md)
- [`docs/20-technical-decisions.md`](docs/20-technical-decisions.md)
