# ProofNest — Architecture Decision Records (ADR)

---

## ADR-001: Technology Stack Selection (MERN Stack)

### Context
ProofNest requires a responsive user interface, flexible JSON document persistence for variable invoice data, and a fast, event-driven backend capable of streaming files and handling asynchronous AI pipelines.

### Decision
Adopt the **MERN Stack** (React 18 + Node.js/Express.js + MongoDB/Mongoose):
- **React 18 (Vite):** Declarative, component-based UI with fast HMR and rich ecosystem for document viewers and calendars.
- **Node.js & Express:** Lightweight, non-blocking I/O for streaming file uploads and downloads, with native JSON parsing.
- **MongoDB & Mongoose:** Document-oriented database that naturally models product lifecycles, nested invoice suggestions, and polymorphic document metadata without complex SQL migrations.

### Status
Accepted.

---

## ADR-002: Monorepo Structure for Six-Developer Team

### Context
A team of six engineers is implementing ProofNest simultaneously. Splitting the project into multiple Git repositories (e.g. `proofnest-api`, `proofnest-web`, `proofnest-docs`) creates high coordination overhead, desynchronized pull requests, and fragmented documentation.

### Decision
Adopt a single unified **Monorepo** structure:
```text
proofnest/
  docs/       # Central architectural contract
  frontend/   # React SPA
  backend/    # Express REST API
  tests/      # Shared integration & E2E suites
```

### Consequences
- Single commit history and atomic PRs linking backend endpoint changes with frontend consumption.
- Simplified CI/CD and single issue tracker.

### Status
Accepted.

---

## ADR-003: MongoDB-Backed Sessions vs. Browser Token Storage

### Context
ProofNest requires browser authentication with persistent sessions and server-side revocation. Browser-readable token storage would expose credentials to JavaScript running in the page context.

### Decision
Use `express-session` with the existing MongoDB-backed `connect-mongo` session store. Store only the session identifier in the `proofnest.sid` cookie, configured as `HttpOnly`, `SameSite=Lax`, seven days, and `Secure` in production. Regenerate the session after login and destroy it on logout. Enforce the configured frontend `Origin` on state-changing requests; allow originless requests only for non-browser JSON clients without a session cookie or Fetch Metadata headers.

### Consequences
- Session identifiers are not readable by client-side scripts and sessions can be revoked server-side.
- `SameSite=Lax` is defense in depth; the Origin check is the CSRF control. CORS alone does not prevent CSRF.
- Frontend HTTP clients must use `credentials: 'include'` / `withCredentials: true`.
- Production deployments must configure `TRUST_PROXY` only for the known reverse-proxy hop count when TLS terminates upstream.

### Status
Accepted and implemented.

---

## ADR-004: Mandatory Human-in-the-Loop OCR Confirmation Workflow

### Context
Optical Character Recognition (OCR) and LLM invoice extractors frequently misread numbers, confuse purchase dates with delivery dates, or mistranslate foreign currency symbols. Automatically writing unreviewed OCR data into product records pollutes the user's asset inventory and causes erroneous warranty notifications.

### Decision
Enforce a strict **two-step extraction state machine**:
1. OCR extraction outputs suggestions into `Document.suggestedFields` with status `review_required`.
2. The user reviews and edits suggestions in the UI.
3. Only upon explicit submission of `POST /api/documents/:id/confirm` are verified `Product` and `Deadline` records created.

### Consequences
- Eliminates erroneous automated records.
- Builds user trust in the accuracy of their inventory and deadline reminders.

### Status
Accepted.

---

## ADR-005: AI Retrieval via MongoDB Native Indexes vs. Standalone Vector Database

### Context
The AI assistant needs to retrieve product metadata, invoices, warranties, and repair records. We evaluated whether to introduce a dedicated vector database (Pinecone, Chroma, Qdrant) or utilize MongoDB's native indexing and compound query capabilities for MVP.

### Decision
**Use MongoDB compound and text search for the MVP.** Defer dedicated vector databases to post-MVP.

### Rationale
- ProofNest queries in MVP are structured: *"Which warranties expire next month?"*, *"How much spent on phone repairs?"*, *"Show laptop invoice"*. These require deterministic date math and exact user-scoped filters.
- Introducing a vector database requires running dual data stores, synchronizing embeddings upon every record edit/delete, and managing external SaaS costs.
- Native MongoDB queries guarantee 100% real-time data consistency and absolute tenant isolation at zero extra cost.

### Status
Accepted.

---

## ADR-006: Storage Adapter Pattern (Local Filesystem vs. S3 Cloud Bucket)

### Context
Developers need to run and test ProofNest locally without creating paid AWS accounts, while staging and production environments require durable cloud object storage.

### Decision
Implement the **Adapter Pattern** with a unified `StorageAdapter` interface:
- `LocalStorageAdapter`: Stores files in `./uploads` with UUID naming for local development and offline unit testing.
- `S3StorageAdapter`: Connects to AWS S3, Cloudflare R2, or MinIO for cloud deployments.

### Status
Accepted.

---

## ADR-007: Dynamic Repair Expense Aggregation vs. Denormalized Running Totals

### Context
The application must report total repair expenses per product. One design option is to store a `totalRepairCost` counter on the `Product` model and increment/decrement it during repair CRUD operations.

### Decision
**Strictly prohibit denormalized running totals.** Compute repair expenses dynamically using MongoDB aggregation pipelines (`$match`, `$group`, `$sum`).

### Rationale
Mutable counter fields inevitably drift out of sync when records are deleted in bulk, database transactions fail midway, or manual database corrections occur. Dynamic aggregation guarantees 100% mathematical accuracy derived directly from stored source records.

### Status
Accepted.

---

## ADR-008: In-Process Node-Cron Scheduler with MongoDB Locks for MVP

### Context
ProofNest must evaluate upcoming deadlines and dispatch in-app reminder notifications. We evaluated heavy external job queues (BullMQ + Redis, Celery) vs. an in-process Node-cron runner with database locks.

### Decision
**Adopt Node-cron with optimistic MongoDB execution locking for MVP.** Heavy Redis queues are deferred to post-MVP scaling phases.

### Rationale
Node-cron eliminates the requirement for a Redis container in local development. Optimistic database locking (`Deadline.lastNotifiedAt` matching today) guarantees idempotency and prevents duplicate notifications even if multiple API instances run in parallel.

### Status
Accepted.

