# GitHub Actions

No production CI pipeline is active in the blueprint phase.

Planned workflow: `ci.yml` (Phase 2+)

1. Install frontend and backend dependencies.
2. Run lint (when configured).
3. Run unit and API tests.
4. Fail the job if secrets are detected in the diff.

Do not store deployment credentials in workflow files. See [`docs/18-deployment-guide.md`](../../docs/18-deployment-guide.md).
