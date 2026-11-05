# ProofNest documentation index

This folder is the implementation contract. If code and these documents disagree, stop and update the contract first.

## How to read this set

| If you need | Open |
| --- | --- |
| What ProofNest is | [01-project-overview.md](01-project-overview.md) |
| Why it exists | [02-problem-statement.md](02-problem-statement.md) |
| What must ship | [03-requirements.md](03-requirements.md), [04-feature-specification.md](04-feature-specification.md) |
| How the system is shaped | [05-system-architecture.md](05-system-architecture.md) |
| Data | [06-database-design.md](06-database-design.md) |
| HTTP contracts | [07-api-documentation.md](07-api-documentation.md) |
| UI structure | [08-frontend-architecture.md](08-frontend-architecture.md), [13-ui-ux-guidelines.md](13-ui-ux-guidelines.md) |
| Server structure | [09-backend-architecture.md](09-backend-architecture.md) |
| Assistant and OCR | [10-ai-architecture.md](10-ai-architecture.md), [11-document-processing.md](11-document-processing.md) |
| Security | [12-security-design.md](12-security-design.md) |
| How we work | [14-git-workflow.md](14-git-workflow.md), [15-team-responsibilities.md](15-team-responsibilities.md) |
| Order of work | [16-development-roadmap.md](16-development-roadmap.md) |
| Quality bar | [17-testing-strategy.md](17-testing-strategy.md), [22-acceptance-criteria.md](22-acceptance-criteria.md) |
| Run and deploy | [18-deployment-guide.md](18-deployment-guide.md), [19-environment-configuration.md](19-environment-configuration.md) |
| Why we chose X | [20-technical-decisions.md](20-technical-decisions.md) |
| What can go wrong | [21-risk-register.md](21-risk-register.md) |
| Not MVP | [23-future-enhancements.md](23-future-enhancements.md) |
| Every planned file | [../PROJECT_FILE_MAP.md](../PROJECT_FILE_MAP.md) |

## Diagrams

Mermaid sources live in [`diagrams/`](diagrams/). Render them in GitHub or any Mermaid-capable preview.

| Diagram | File |
| --- | --- |
| System architecture | [diagrams/system-architecture.mmd](diagrams/system-architecture.mmd) |
| User journeys | [diagrams/user-journey.mmd](diagrams/user-journey.mmd) |
| Data relationships | [diagrams/database-relationships.mmd](diagrams/database-relationships.mmd) |
| Invoice extraction sequence | [diagrams/document-processing-sequence.mmd](diagrams/document-processing-sequence.mmd) |
| AI assistant sequence | [diagrams/ai-assistant-sequence.mmd](diagrams/ai-assistant-sequence.mmd) |
| Reminder workflow | [diagrams/reminder-workflow.mmd](diagrams/reminder-workflow.mmd) |
| Frontend/backend communication | [diagrams/api-communication.mmd](diagrams/api-communication.mmd) |
| Deployment | [diagrams/deployment-architecture.mmd](diagrams/deployment-architecture.mmd) |

## Non-negotiable product rules

These rules are repeated because they define ProofNest:

1. A product belongs to exactly one authenticated user in MVP.
2. Documents, deadlines, repairs, notifications, and assistant history inherit that ownership.
3. OCR/AI output is a **suggestion**. It becomes product or deadline data only after `POST /api/documents/:id/confirm`.
4. Repair expense totals are sums of stored repair records, never a separately edited running total.
5. The assistant may only read records the caller owns, must cite sources, and must say when data is missing or unverified.
6. Scheduler reruns must not create duplicate reminder notifications.

## Documentation owners

| Area | Proposed owner |
| --- | --- |
| Index, overview, roadmap | Member 1 — Project Lead |
| API, backend, security | Member 4 — Backend Developer |
| Database | Member 5 — Database Developer |
| Frontend and UI/UX | Member 2 — Frontend Lead |
| AI, OCR, tests | Member 6 — AI / Testing / Documentation |
