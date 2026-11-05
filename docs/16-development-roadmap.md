# ProofNest — 14-Phase Development Roadmap

---

## Roadmap Overview

```
PHASE 1 ──> PHASE 2 ──> PHASE 3 ──> PHASE 4 ──> PHASE 5 ──> PHASE 6 ──> PHASE 7
Blueprint   Setup       Database    Auth & BE   Inventory   Documents   OCR Flow
                                                                            │
PHASE 14 <── PHASE 13 <── PHASE 12 <── PHASE 11 <── PHASE 10 <── PHASE 9 <── PHASE 8
Demo & Docs  Deploy       Testing      Integration AI Assist   Repairs     Deadlines
```

---

## Detailed Phase Breakdown

### Phase 1: Project Blueprint & Foundation (Current Phase)
- **Objective:** Create the complete system blueprint, data models, API specs, and team allocations.
- **Tasks:** Author `docs/01` through `docs/23`, generate architecture diagrams, create file maps, and commit as Git Commit 2.
- **Lead:** Member 1 (Project Lead) & Member 6 (Docs/AI).
- **Deliverables:** Complete documentation suite, Mermaid diagrams, `PROJECT_FILE_MAP.md`.
- **Acceptance Criteria:** All documentation verified, diagrams syntactically valid, second Git commit created.

### Phase 2: Repository & Environment Setup
- **Objective:** Bootstrap frontend and backend scaffoldings with necessary dependencies and configurations.
- **Tasks:**
  - Initialize `frontend/package.json` with React, Vite, Tailwind CSS, Lucide React, Axios.
  - Initialize `backend/package.json` with Express, Mongoose, bcryptjs, jsonwebtoken, cors, helmet, multer.
  - Verify local `.env` loading and establish root run scripts.
- **Lead:** Member 1, Member 2, Member 4.
- **Deliverables:** Runnable dev servers (`npm run dev`), initial config files.

### Phase 3: Database Models & Indexes
- **Objective:** Implement and validate all Mongoose schemas.
- **Tasks:** Create `User.js`, `Product.js`, `Document.js`, `Deadline.js`, `Repair.js`, `Notification.js`, `AiConversation.js`. Configure compound indexes.
- **Lead:** Member 5 (Database Developer).
- **Deliverables:** Complete schema files with validation tests.

### Phase 4: Authentication & Backend Foundation
- **Objective:** Implement user registration, login, logout, password hashing, and JWT cookie management.
- **Tasks:** Implement `authRoutes.js`, `authController.js`, `authMiddleware.js`, bcrypt hashing, and rate limiting.
- **Lead:** Member 4 (Backend Developer).
- **Deliverables:** Working auth endpoints returning httpOnly cookies.

### Phase 5: Personal Asset Inventory Module
- **Objective:** Build complete CRUD and search capabilities for products.
- **Tasks:**
  - Backend: Implement `ProductService.js`, `productController.js`, `productRoutes.js`.
  - Frontend: Build `ProductListPage.jsx`, `ProductDetailPage.jsx`, `AddProductPage.jsx`, search/filtering controls.
- **Lead:** Member 4 (Backend) & Member 3 (Frontend).
- **Deliverables:** End-to-end product catalog with filtering, sorting, and detail views.

### Phase 6: Document Management & Secure Storage
- **Objective:** Implement multi-format document uploads, storage adapters, and streaming downloads.
- **Tasks:**
  - Build `LocalStorageAdapter.js` and `StorageAdapter.js`.
  - Implement `documentRoutes.js`, upload validation middleware, and authorized streaming download.
  - Frontend: Build `DocumentVaultPage.jsx` and file dropzone.
- **Lead:** Member 4 (Backend) & Member 3 (Frontend).
- **Deliverables:** Secure file upload and authorized streaming download pipeline.

### Phase 7: OCR & Extraction Review Workflow
- **Objective:** Build the invoice extraction pipeline with mandatory human review.
- **Tasks:**
  - Implement `DocumentExtractor.js` and `OcrAdapter.js` (Tesseract.js / Cloud).
  - Implement field normalization logic for dates, amounts, and brands.
  - Frontend: Build the side-by-side `ExtractionReviewModal.jsx` and confirmation handler.
- **Lead:** Member 6 (AI/Testing) & Member 3 (Frontend).
- **Deliverables:** Functional invoice scan-to-product workflow with manual review.

### Phase 8: Smart Deadlines & Reminder Scheduler
- **Objective:** Implement warranty, return, and maintenance deadline tracking with automated scheduled alerts.
- **Tasks:**
  - Implement `DeadlineService.js`, `WarrantyTracker.js`, and `deadlineRoutes.js`.
  - Implement `reminderScheduler.js` cron worker with idempotent execution locks.
  - Frontend: Build `DeadlineCalendarPage.jsx` and notification badges.
- **Lead:** Member 4 (Backend) & Member 3 (Frontend).
- **Deliverables:** Working calendar view and automated in-app reminder dispatch.

### Phase 9: Repair History & Expense Tracker
- **Objective:** Implement service logging and dynamic repair cost aggregation.
- **Tasks:**
  - Implement `RepairHistoryManager.js`, `repairRoutes.js`, and MongoDB aggregation queries.
  - Frontend: Build `RepairTrackerPage.jsx` and total spend summary cards.
- **Lead:** Member 5 (Database) & Member 3 (Frontend).
- **Deliverables:** Chronological repair log with dynamic currency-grouped cost totals.

### Phase 10: AI Product Assistant
- **Objective:** Build grounded, natural-language question answering over user records.
- **Tasks:**
  - Implement `AiRetrievalService.js`, intent classifier, and grounded prompt templates.
  - Integrate LLM adapter.
  - Frontend: Build `AssistantPage.jsx` chat interface with citation pills.
- **Lead:** Member 6 (AI/Testing) & Member 3 (Frontend).
- **Deliverables:** Working AI assistant with strict zero-hallucination citation protocol.

### Phase 11: End-to-End System Integration
- **Objective:** Connect all frontend modules with backend endpoints, verify layouts, and link the unified dashboard.
- **Tasks:** Connect `DashboardPage.jsx` to `/api/dashboard/summary`, test end-to-end user journeys.
- **Lead:** Member 1 (Project Lead) & Entire Team.
- **Deliverables:** Fully integrated, cohesive application.

### Phase 12: Security Hardening & Full Testing Suite
- **Objective:** Execute comprehensive unit, integration, isolation, and security test suites.
- **Tasks:** Write test suites in `tests/`, verify tenant isolation, test IDOR boundaries, perform penetration audit.
- **Lead:** Member 6 (AI/Testing) & Member 4 (Backend).
- **Deliverables:** Passing automated test suite with coverage report.

### Phase 13: Deployment & Hosting
- **Objective:** Deploy frontend, backend, database, and storage to staging and production environments.
- **Tasks:** Deploy backend to PaaS (Render/Railway), database to MongoDB Atlas, frontend to Vercel/Netlify.
- **Lead:** Member 1 (Project Lead) & Member 4 (Backend).
- **Deliverables:** Live, publicly accessible application with HTTPS and domain configuration.

### Phase 14: Final Handoff & Presentation
- **Objective:** Package documentation, prepare demonstration script, and finalize project handoff.
- **Tasks:** Create demo seed data, verify all user journeys, prepare slide deck.
- **Lead:** Member 1 (Project Lead) & Entire Team.
- **Deliverables:** Final presentation and successful live demonstration.
