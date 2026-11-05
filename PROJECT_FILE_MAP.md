# ProofNest — Project File Map & Repository Blueprint

---

## 1. Overview & Directory Philosophy

This document provides the complete, implementation-ready repository layout for ProofNest. It details the purpose, owning module, internal dependencies, assigned team member, and scope status (MVP vs. Post-MVP) for every planned directory and file.

### Six-Member Operational Roles (Proposed)
- **Member 1:** Project Lead / Integration Lead
- **Member 2:** Frontend Lead
- **Member 3:** Frontend Developer
- **Member 4:** Backend Developer
- **Member 5:** Database Developer
- **Member 6:** AI / Testing / Documentation Developer

---

## 2. Complete Repository Tree

```text
proofnest/
|-- .editorconfig
|-- .env.example
|-- .gitignore
|-- CONTRIBUTING.md
|-- package.json
|-- PROJECT_FILE_MAP.md
|-- README.md
|
|-- .github/
|   |-- workflows/
|       |-- ci.yml
|       |-- README.md
|
|-- docs/
|   |-- README.md
|   |-- 01-project-overview.md
|   |-- 02-problem-statement.md
|   |-- 03-requirements.md
|   |-- 04-feature-specification.md
|   |-- 05-system-architecture.md
|   |-- 06-database-design.md
|   |-- 07-api-documentation.md
|   |-- 08-frontend-architecture.md
|   |-- 09-backend-architecture.md
|   |-- 10-ai-architecture.md
|   |-- 11-document-processing.md
|   |-- 12-security-design.md
|   |-- 13-ui-ux-guidelines.md
|   |-- 14-git-workflow.md
|   |-- 15-team-responsibilities.md
|   |-- 16-development-roadmap.md
|   |-- 17-testing-strategy.md
|   |-- 18-deployment-guide.md
|   |-- 19-environment-configuration.md
|   |-- 20-technical-decisions.md
|   |-- 21-risk-register.md
|   |-- 22-acceptance-criteria.md
|   |-- 23-future-enhancements.md
|   |-- diagrams/
|       |-- system-architecture.mmd
|       |-- user-journey.mmd
|       |-- database-relationships.mmd
|       |-- document-processing-sequence.mmd
|       |-- ai-assistant-sequence.mmd
|       |-- reminder-workflow.mmd
|       |-- api-communication.mmd
|       |-- deployment-architecture.mmd
|
|-- frontend/
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- README.md
|   |-- tailwind.config.js
|   |-- vite.config.js
|   |-- public/
|   |   |-- favicon.svg
|   |   |-- logo.svg
|   |-- src/
|       |-- App.jsx
|       |-- main.jsx
|       |-- assets/
|       |   |-- empty-box.svg
|       |   |-- empty-calendar.svg
|       |-- components/
|       |   |-- common/
|       |   |   |-- Badge.jsx
|       |   |   |-- Button.jsx
|       |   |   |-- Card.jsx
|       |   |   |-- ConfirmDialog.jsx
|       |   |   |-- Dropdown.jsx
|       |   |   |-- EmptyState.jsx
|       |   |   |-- Input.jsx
|       |   |   |-- Modal.jsx
|       |   |   |-- Skeleton.jsx
|       |   |   |-- Spinner.jsx
|       |   |   |-- Toast.jsx
|       |   |-- layout/
|       |   |   |-- AppShell.jsx
|       |   |   |-- Breadcrumbs.jsx
|       |   |   |-- Footer.jsx
|       |   |   |-- MobileNav.jsx
|       |   |   |-- Navbar.jsx
|       |   |   |-- NotificationBell.jsx
|       |   |   |-- Sidebar.jsx
|       |   |-- dashboard/
|       |   |   |-- QuickActionToolbar.jsx
|       |   |   |-- RecentProductsWidget.jsx
|       |   |   |-- RepairSpendWidget.jsx
|       |   |   |-- StatCard.jsx
|       |   |   |-- UpcomingDeadlinesWidget.jsx
|       |   |-- products/
|       |   |   |-- CategoryFilterChips.jsx
|       |   |   |-- DeleteProductModal.jsx
|       |   |   |-- ProductCard.jsx
|       |   |   |-- ProductForm.jsx
|       |   |   |-- ProductSearchBar.jsx
|       |   |   |-- ProductTable.jsx
|       |   |   |-- ProductTimeline.jsx
|       |   |   |-- WarrantyStatusPill.jsx
|       |   |-- documents/
|       |   |   |-- DocumentCard.jsx
|       |   |   |-- DocumentDropzone.jsx
|       |   |   |-- DocumentPreviewModal.jsx
|       |   |   |-- ExtractionReviewModal.jsx
|       |   |-- deadlines/
|       |   |   |-- AddDeadlineModal.jsx
|       |   |   |-- CalendarGrid.jsx
|       |   |   |-- DeadlineItem.jsx
|       |   |   |-- OverdueAlertBanner.jsx
|       |   |-- repairs/
|       |   |   |-- AddRepairModal.jsx
|       |   |   |-- EditRepairModal.jsx
|       |   |   |-- RepairCostSummaryCard.jsx
|       |   |   |-- RepairHistoryList.jsx
|       |   |   |-- RepairItemCard.jsx
|       |   |-- assistant/
|       |       |-- ChatWindow.jsx
|       |       |-- CitationBadge.jsx
|       |       |-- MessageBubble.jsx
|       |       |-- PromptSuggestionsCarousel.jsx
|       |-- constants/
|       |   |-- categories.js
|       |   |-- deadlineTypes.js
|       |   |-- navItems.js
|       |   |-- storageKeys.js
|       |-- context/
|       |   |-- AuthContext.jsx
|       |   |-- NotificationContext.jsx
|       |   |-- ToastContext.jsx
|       |-- hooks/
|       |   |-- useAssistant.js
|       |   |-- useAuth.js
|       |   |-- useDeadlines.js
|       |   |-- useDocuments.js
|       |   |-- useNotifications.js
|       |   |-- useProducts.js
|       |   |-- useRepairs.js
|       |-- layouts/
|       |   |-- AuthLayout.jsx
|       |   |-- MainLayout.jsx
|       |-- pages/
|       |   |-- NotFoundPage.jsx
|       |   |-- assistant/
|       |   |   |-- AssistantPage.jsx
|       |   |-- auth/
|       |   |   |-- LoginPage.jsx
|       |   |   |-- RegisterPage.jsx
|       |   |-- dashboard/
|       |   |   |-- DashboardPage.jsx
|       |   |-- deadlines/
|       |   |   |-- DeadlineCalendarPage.jsx
|       |   |-- documents/
|       |   |   |-- DocumentVaultPage.jsx
|       |   |-- products/
|       |   |   |-- AddProductPage.jsx
|       |   |   |-- EditProductPage.jsx
|       |   |   |-- ProductDetailPage.jsx
|       |   |   |-- ProductListPage.jsx
|       |   |-- repairs/
|       |   |   |-- RepairTrackerPage.jsx
|       |   |-- settings/
|       |       |-- ProfileSettingsPage.jsx
|       |-- routes/
|       |   |-- AppRoutes.jsx
|       |   |-- ProtectedRoute.jsx
|       |   |-- PublicRoute.jsx
|       |-- services/
|       |   |-- api.js
|       |   |-- assistantService.js
|       |   |-- authService.js
|       |   |-- deadlineService.js
|       |   |-- documentService.js
|       |   |-- notificationService.js
|       |   |-- productService.js
|       |   |-- repairService.js
|       |-- styles/
|       |   |-- index.css
|       |-- utils/
|           |-- currencyFormatter.js
|           |-- dateUtils.js
|           |-- fileHelpers.js
|           |-- validators.js
|
|-- backend/
|   |-- .env.example
|   |-- Dockerfile
|   |-- package.json
|   |-- README.md
|   |-- src/
|       |-- app.js
|       |-- server.js
|       |-- config/
|       |   |-- database.js
|       |   |-- env.js
|       |   |-- storage.js
|       |-- constants/
|       |   |-- errorCodes.js
|       |   |-- regexes.js
|       |   |-- statusEnums.js
|       |-- controllers/
|       |   |-- assistantController.js
|       |   |-- authController.js
|       |   |-- dashboardController.js
|       |   |-- deadlineController.js
|       |   |-- documentController.js
|       |   |-- notificationController.js
|       |   |-- productController.js
|       |   |-- repairController.js
|       |-- integrations/
|       |   |-- llm/
|       |   |   |-- LlmAdapter.js
|       |   |   |-- OpenAiAdapter.js
|       |   |-- notifications/
|       |   |   |-- EmailAdapter.js
|       |   |   |-- SmtpEmailAdapter.js
|       |   |-- ocr/
|       |   |   |-- CloudOcrAdapter.js
|       |   |   |-- OcrAdapter.js
|       |   |   |-- TesseractAdapter.js
|       |   |-- storage/
|       |       |-- LocalStorageAdapter.js
|       |       |-- S3StorageAdapter.js
|       |       |-- StorageAdapter.js
|       |-- jobs/
|       |   |-- cleanupJob.js
|       |   |-- reminderScheduler.js
|       |-- middleware/
|       |   |-- authMiddleware.js
|       |   |-- errorMiddleware.js
|       |   |-- rateLimitMiddleware.js
|       |   |-- uploadMiddleware.js
|       |   |-- validateMiddleware.js
|       |-- models/
|       |   |-- AiConversation.js
|       |   |-- Deadline.js
|       |   |-- Document.js
|       |   |-- Notification.js
|       |   |-- Product.js
|       |   |-- Repair.js
|       |   |-- User.js
|       |-- routes/
|       |   |-- assistantRoutes.js
|       |   |-- authRoutes.js
|       |   |-- dashboardRoutes.js
|       |   |-- deadlineRoutes.js
|       |   |-- documentRoutes.js
|       |   |-- index.js
|       |   |-- notificationRoutes.js
|       |   |-- productRoutes.js
|       |   |-- repairRoutes.js
|       |-- services/
|       |   |-- AiRetrievalService.js
|       |   |-- DashboardService.js
|       |   |-- DeadlineService.js
|       |   |-- DocumentExtractor.js
|       |   |-- NotificationService.js
|       |   |-- ProductService.js
|       |   |-- RepairHistoryManager.js
|       |   |-- WarrantyTracker.js
|       |-- utils/
|       |   |-- dateHelpers.js
|       |   |-- fileHelpers.js
|       |   |-- logger.js
|       |   |-- responseFormatter.js
|       |-- validators/
|           |-- assistantValidator.js
|           |-- authValidator.js
|           |-- deadlineValidator.js
|           |-- documentValidator.js
|           |-- productValidator.js
|           |-- repairValidator.js
|
|-- scripts/
|   |-- check-mermaid.js
|   |-- dev.ps1
|   |-- dev.sh
|   |-- README.md
|   |-- seed-dev.js
|
|-- tests/
|   |-- README.md
|   |-- backend/
|   |   |-- models/
|   |   |   |-- Product.test.js
|   |   |   |-- User.test.js
|   |   |-- services/
|   |       |-- DocumentExtractor.test.js
|   |       |-- ProductService.test.js
|   |       |-- RepairHistoryManager.test.js
|   |       |-- WarrantyTracker.test.js
|   |-- frontend/
|   |   |-- components/
|   |       |-- ExtractionReviewModal.test.jsx
|   |       |-- ProductCard.test.jsx
|   |-- integration/
|   |   |-- assistant.api.test.js
|   |   |-- auth.api.test.js
|   |   |-- deadlines.api.test.js
|   |   |-- documents.api.test.js
|   |   |-- isolation.api.test.js
|   |   |-- products.api.test.js
|   |   |-- repairs.api.test.js
|   |-- e2e/
|       |-- ai-assistant-grounding.spec.js
|       |-- invoice-upload-and-confirmation.spec.js
|       |-- user-registration-and-product-entry.spec.js
```

---

## 3. Detailed File Catalog & Responsibilities

### 3.1 Root Repository Files
| File Path | Purpose & Responsibilities | Owning Module | Assigned Member | Scope |
| :--- | :--- | :--- | :---: | :---: |
| `README.md` | Primary entry point; explains mission, modules, stack, and blueprint status. | Project Lead | Member 1 | MVP |
| `PROJECT_FILE_MAP.md` | Complete repository tree and per-file responsibility catalog. | Architecture | Member 1 | MVP |
| `CONTRIBUTING.md` | Team development and Git workflow guidelines. | Architecture | Member 1 | MVP |
| `.gitignore` | Excludes `node_modules`, `.env`, build artifacts, and uploaded test files. | DevOps | Member 1 | MVP |
| `.editorconfig` | Enforces LF line endings, 2-space indentation, and UTF-8 charset. | DevOps | Member 1 | MVP |
| `.env.example` | Root environment pointer documentation. | DevOps | Member 1 | MVP |

---

### 3.2 Documentation Suite (`docs/`)
| File Path | Purpose & Responsibilities | Owning Module | Assigned Member | Scope |
| :--- | :--- | :--- | :---: | :---: |
| `docs/README.md` | Documentation index linking all architecture and blueprint files. | Architecture | Member 1 | MVP |
| `docs/01-project-overview.md` | Project identity, mission, target personas, and domain boundaries. | Overview | Member 1 | MVP |
| `docs/02-problem-statement.md` | Root cause analysis of post-purchase document chaos and missed deadlines. | Research | Member 1 | MVP |
| `docs/03-requirements.md` | Comprehensive functional (FR) and non-functional (NFR) requirements. | Requirements | Member 1 | MVP |
| `docs/04-feature-specification.md`| Deep specifications for Inventory, OCR review, Deadlines, Repairs, AI. | Product Specs | Member 1 | MVP |
| `docs/05-system-architecture.md` | High-level system architecture, layered design, and data flow diagrams. | Architecture | Member 1 | MVP |
| `docs/06-database-design.md` | Mongoose schemas, relationships, compound indexes, and cascade policies. | Database | Member 5 | MVP |
| `docs/07-api-documentation.md` | REST API endpoint contracts, query parameters, error envelopes, and JSONs. | API/Backend | Member 4 | MVP |
| `docs/08-frontend-architecture.md`| React SPA hierarchy, state management, page breakdown, and routing. | Frontend | Member 2 | MVP |
| `docs/09-backend-architecture.md` | Express pipeline, OOP service contracts (`ProductService`, `WarrantyTracker`). | Backend | Member 4 | MVP |
| `docs/10-ai-architecture.md` | Grounded AI retrieval, zero-hallucination prompt, citation verification. | AI / Assistant | Member 6 | MVP |
| `docs/11-document-processing.md` | Multi-format upload, 10-step human-in-the-loop OCR review, adapters. | Processing | Member 6 | MVP |
| `docs/12-security-design.md` | JWT httpOnly cookies, password hashing, tenant isolation, upload hardening. | Security | Member 4 | MVP |
| `docs/13-ui-ux-guidelines.md` | Tailwind tokens, color palette, responsive breakpoints, accessible states. | UI/UX | Member 2 | MVP |
| `docs/14-git-workflow.md` | Trunk-based Git workflow, Conventional Commits, PR review checklists. | DevOps | Member 1 | MVP |
| `docs/15-team-responsibilities.md`| Six-member development plan, RACI matrix, shared file protocols. | Team Lead | Member 1 | MVP |
| `docs/16-development-roadmap.md` | 14-phase roadmap from Blueprint through deployment and demo. | Management | Member 1 | MVP |
| `docs/17-testing-strategy.md` | Unit, integration, isolation, and Playwright E2E test plan. | QA / Testing | Member 6 | MVP |
| `docs/18-deployment-guide.md` | Docker containerization, MongoDB Atlas, S3 buckets, PaaS deployment. | DevOps | Member 1 | MVP |
| `docs/19-environment-configuration.md`| Comprehensive variable catalog for frontend, backend, and development. | DevOps | Member 4 | MVP |
| `docs/20-technical-decisions.md` | Architecture Decision Records (ADRs 001 through 008). | Architecture | Member 1 | MVP |
| `docs/21-risk-register.md` | Risk assessment matrix covering security, AI, performance, and team risks. | Risk Mgmt | Member 1 | MVP |
| `docs/22-acceptance-criteria.md`| Given-When-Then formal criteria for all 10 core features. | QA / Testing | Member 6 | MVP |
| `docs/23-future-enhancements.md`| Post-MVP features (Google Calendar sync, email ingest, household RBAC). | Product Specs | Member 1 | Post-MVP |

---

### 3.3 Architecture Diagrams (`docs/diagrams/`)
| File Path | Description | Format | Assigned Member | Scope |
| :--- | :--- | :---: | :---: | :---: |
| `docs/diagrams/system-architecture.mmd` | Complete layered system architecture diagram. | Mermaid | Member 1 | MVP |
| `docs/diagrams/user-journey.mmd` | High-level user journeys (Product, OCR, Deadlines, Repairs, AI). | Mermaid | Member 1 | MVP |
| `docs/diagrams/database-relationships.mmd`| Entity Relationship Diagram (ERD) for MongoDB collections. | Mermaid | Member 5 | MVP |
| `docs/diagrams/document-processing-sequence.mmd`| Sequence diagram of the 10-step human-in-the-loop OCR workflow. | Mermaid | Member 6 | MVP |
| `docs/diagrams/ai-assistant-sequence.mmd`| Sequence diagram of grounded AI retrieval and citation verification. | Mermaid | Member 6 | MVP |
| `docs/diagrams/reminder-workflow.mmd` | Sequence diagram of the idempotent scheduled reminder worker. | Mermaid | Member 4 | MVP |
| `docs/diagrams/api-communication.mmd` | Sequence diagram of frontend/backend HTTP REST communication. | Mermaid | Member 4 | MVP |
| `docs/diagrams/deployment-architecture.mmd`| Infrastructure topology diagram (CDN, Vercel, Render, Atlas, S3). | Mermaid | Member 1 | MVP |

---

### 3.4 Backend Planned Source Structure (`backend/src/`)
| File Path | Responsibility & Key Classes / Functions | Assigned Member | Scope |
| :--- | :--- | :---: | :---: |
| `server.js` | HTTP listener bootstrap, MongoDB connection setup, graceful shutdown. | Member 4 | MVP |
| `app.js` | Express app configuration, middleware pipeline mounting, route routing. | Member 4 | MVP |
| `config/database.js` | Mongoose connection initialization with retry logic and event listeners. | Member 5 | MVP |
| `config/env.js` | Runtime validation of backend environment variables via schema parser. | Member 4 | MVP |
| `config/storage.js` | Storage engine configuration (Local filesystem vs. S3 bucket settings). | Member 4 | MVP |
| `constants/errorCodes.js` | Standardized error string enums (`NOT_FOUND`, `UNAUTHORIZED`, etc.). | Member 4 | MVP |
| `constants/statusEnums.js` | Document extraction statuses, deadline types, product status constants. | Member 5 | MVP |
| `models/User.js` | Mongoose User model with bcrypt hashing and validation. | Member 5 | MVP |
| `models/Product.js` | Mongoose Product model with compound indexes and validation. | Member 5 | MVP |
| `models/Document.js` | Mongoose Document model with extraction fields and suggested values. | Member 5 | MVP |
| `models/Deadline.js` | Mongoose Deadline model with due dates and notification tracking. | Member 5 | MVP |
| `models/Repair.js` | Mongoose Repair model with service centers and costs. | Member 5 | MVP |
| `models/Notification.js` | Mongoose Notification model with read states and alert types. | Member 5 | MVP |
| `models/AiConversation.js` | Mongoose model tracking user assistant conversations and message history. | Member 5 | MVP |
| `services/ProductService.js` | OOP class managing product CRUD, filtering, and timeline aggregation. | Member 4 | MVP |
| `services/WarrantyTracker.js` | OOP class managing warranty countdowns and deadline synchronization. | Member 4 | MVP |
| `services/RepairHistoryManager.js`| OOP class managing repair logging and dynamic cost aggregation pipelines. | Member 5 | MVP |
| `services/DocumentExtractor.js` | OOP class managing storage, OCR dispatch, and human confirmation flow. | Member 6 | MVP |
| `services/DeadlineService.js` | OOP class managing deadline schedules and due date evaluations. | Member 4 | MVP |
| `services/NotificationService.js`| OOP class managing in-app notifications and email dispatching. | Member 4 | MVP |
| `services/AiRetrievalService.js`| OOP class managing intent detection, user context retrieval, and citations.| Member 6 | MVP |
| `services/DashboardService.js` | OOP class computing aggregated summary statistics for user dashboard. | Member 4 | MVP |
| `controllers/authController.js` | Handlers for register, login, logout, refresh, and profile retrieval. | Member 4 | MVP |
| `controllers/productController.js`| Handlers for product CRUD, filtering, and timeline retrieval. | Member 4 | MVP |
| `controllers/documentController.js`| Handlers for file upload, extraction trigger, suggestions, and confirmation. | Member 4 | MVP |
| `controllers/deadlineController.js`| Handlers for deadline creation, calendar queries, and completion. | Member 4 | MVP |
| `controllers/repairController.js` | Handlers for repair CRUD and dynamic expense aggregation. | Member 4 | MVP |
| `controllers/assistantController.js`| Handlers for natural language AI questions and conversation history. | Member 6 | MVP |
| `controllers/dashboardController.js`| Handlers for dashboard metrics and summary cards. | Member 4 | MVP |
| `middleware/authMiddleware.js` | Verifies JWT cookie, extracts `userId`, enforces authentication. | Member 4 | MVP |
| `middleware/uploadMiddleware.js`| Multer configuration for file size limit (10MB) and MIME validation. | Member 4 | MVP |
| `middleware/validateMiddleware.js`| Express-validator middleware evaluating schema violations. | Member 4 | MVP |
| `middleware/rateLimitMiddleware.js`| Express-rate-limit instances for auth, AI, and global API routes. | Member 4 | MVP |
| `middleware/errorMiddleware.js` | Centralized error handler translating AppErrors and Mongoose errors. | Member 4 | MVP |
| `integrations/storage/StorageAdapter.js`| Base interface for file persistence. | Member 4 | MVP |
| `integrations/storage/LocalStorageAdapter.js`| Local disk persistence implementation. | Member 4 | MVP |
| `integrations/storage/S3StorageAdapter.js`| AWS S3 / Cloudflare R2 persistence implementation. | Member 4 | MVP |
| `integrations/ocr/OcrAdapter.js` | Base interface for OCR entity extraction. | Member 6 | MVP |
| `integrations/ocr/TesseractAdapter.js`| Local Tesseract.js offline extraction adapter. | Member 6 | MVP |
| `integrations/ocr/CloudOcrAdapter.js`| Cloud Document AI / Textract production adapter. | Member 6 | MVP |
| `integrations/llm/LlmAdapter.js` | Base interface for grounded LLM querying. | Member 6 | MVP |
| `integrations/llm/OpenAiAdapter.js`| OpenAI-compatible grounded generation adapter. | Member 6 | MVP |
| `jobs/reminderScheduler.js` | Node-cron worker checking deadlines and dispatching notifications. | Member 4 | MVP |
| `jobs/cleanupJob.js` | Maintenance worker purging unconfirmed orphaned uploads older than 7d. | Member 4 | MVP |

---

### 3.5 Frontend Planned Source Structure (`frontend/src/`)
| File Path | Responsibility & Components | Assigned Member | Scope |
| :--- | :--- | :---: | :---: |
| `main.jsx` | React root mounting, global CSS import. | Member 2 | MVP |
| `App.jsx` | Top-level context providers (`Auth`, `Notification`, `Toast`) and routes. | Member 2 | MVP |
| `routes/AppRoutes.jsx` | React Router route configuration with ProtectedRoute wrappers. | Member 2 | MVP |
| `routes/ProtectedRoute.jsx` | Guard redirecting unauthenticated users to `/login`. | Member 2 | MVP |
| `layouts/MainLayout.jsx` | Authenticated app shell with persistent Sidebar and Navbar. | Member 2 | MVP |
| `layouts/AuthLayout.jsx` | Centered minimalist card layout for login and registration. | Member 2 | MVP |
| `pages/dashboard/DashboardPage.jsx` | High-level metrics, upcoming deadlines, recent products, repair spend. | Member 3 | MVP |
| `pages/products/ProductListPage.jsx` | Catalog of products with search bar, category chips, and sort controls. | Member 3 | MVP |
| `pages/products/ProductDetailPage.jsx` | Tabbed view of product overview, documents, warranty, and repairs. | Member 3 | MVP |
| `pages/products/AddProductPage.jsx` | Product intake form supporting manual entry and invoice scanning. | Member 3 | MVP |
| `pages/documents/DocumentVaultPage.jsx`| Unified document list with preview modal and download actions. | Member 3 | MVP |
| `pages/deadlines/DeadlineCalendarPage.jsx`| Interactive monthly calendar and upcoming deadline agenda. | Member 3 | MVP |
| `pages/repairs/RepairTrackerPage.jsx`| Log of all repairs, service centers, and total expense breakdown. | Member 3 | MVP |
| `pages/assistant/AssistantPage.jsx` | Conversational interface with citation badges and prompt carousel. | Member 3 | MVP |
| `pages/settings/ProfileSettingsPage.jsx`| Currency preference and notification alert settings. | Member 3 | MVP |
| `components/documents/ExtractionReviewModal.jsx`| Side-by-side invoice preview and editable suggestion review dialog. | Member 3 | MVP |
| `components/products/ProductCard.jsx` | Product grid card with image, price, and warranty pill. | Member 2 | MVP |
| `components/products/ProductTable.jsx`| Dense tabular view for inventory. | Member 2 | MVP |
| `components/deadlines/CalendarGrid.jsx`| Monthly calendar component rendering deadline event markers. | Member 3 | MVP |
| `components/repairs/RepairCostSummaryCard.jsx`| Dynamic total repair spend widget grouped by currency. | Member 3 | MVP |
| `components/assistant/ChatWindow.jsx` | Message stream container with auto-scroll. | Member 3 | MVP |
| `components/assistant/CitationBadge.jsx`| Clickable citation pill linking to cited product/invoice. | Member 3 | MVP |
| `context/AuthContext.jsx` | Authentication state, login, logout, and user profile management. | Member 2 | MVP |
| `context/NotificationContext.jsx`| Unread alert counter and live notification feed. | Member 2 | MVP |
| `services/api.js` | Axios client configured with `withCredentials: true` and interceptors. | Member 2 | MVP |

