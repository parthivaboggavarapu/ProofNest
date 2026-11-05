# ProofNest — Six-Member Team Development Plan & Ownership Matrix

---

## 1. Proposed Team Roles & Distribution

To successfully deliver ProofNest across its 14 roadmap phases, responsibilities are partitioned across a six-member full-stack engineering team. 

> *Note: Named assignments below represent proposed operational roles and must be formally confirmed by the team.*

```
+-----------------------------------------------------------------------------------------+
|                                TEAM ROLES & ASSIGNMENTS                                 |
+-----------------------------------------------------------------------------------------+
| Member 1: Project Lead / Integration Lead                                               |
|   - Architecture coordination, repository management, CI/CD, Git hygiene, demo lead.   |
|                                                                                         |
| Member 2: Frontend Lead                                                                 |
|   - React application architecture, layouts, routing, design system tokens, Tailwind.   |
|                                                                                         |
| Member 3: Frontend Developer                                                            |
|   - Feature pages: Product inventory, detail views, extraction review modal, AI chat.   |
|                                                                                         |
| Member 4: Backend Developer                                                             |
|   - Express server, REST endpoints, JWT auth, middleware, OOP domain services.          |
|                                                                                         |
| Member 5: Database Developer                                                            |
|   - MongoDB Mongoose schemas, indexes, queries, aggregation pipelines, data integrity.  |
|                                                                                         |
| Member 6: AI / Testing / Documentation Developer                                        |
|   - OCR pipeline, LLM integration, test suites (unit, API, E2E), technical docs.         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Module Ownership Matrix

| Module | Primary Owner | Secondary Owner | Reviewer |
| :--- | :--- | :--- | :--- |
| **Project Blueprint & Specs** | Member 1 (Project Lead) | Member 6 (Docs/AI) | Entire Team |
| **Frontend Shell & Layouts** | Member 2 (Frontend Lead) | Member 3 (Frontend Dev) | Member 1 |
| **Personal Asset Inventory (FE)** | Member 3 (Frontend Dev) | Member 2 (Frontend Lead) | Member 2 |
| **Personal Asset Inventory (BE)** | Member 4 (Backend Dev) | Member 5 (Database Dev) | Member 1 |
| **Document Vault & Uploads** | Member 4 (Backend Dev) | Member 3 (Frontend Dev) | Member 6 |
| **OCR Extraction Pipeline** | Member 6 (AI/Testing) | Member 4 (Backend Dev) | Member 1 |
| **Extraction Review Modal (FE)** | Member 3 (Frontend Dev) | Member 6 (AI/Testing) | Member 2 |
| **Smart Deadlines & Calendar** | Member 4 (Backend Dev) | Member 3 (Frontend Dev) | Member 5 |
| **Repair History & Cost Tracker** | Member 5 (Database Dev) | Member 4 (Backend Dev) | Member 1 |
| **AI Product Assistant (RAG/LLM)** | Member 6 (AI/Testing) | Member 4 (Backend Dev) | Member 1 |
| **Database Schemas & Aggregations** | Member 5 (Database Dev) | Member 4 (Backend Dev) | Member 1 |
| **Security & Tenant Isolation** | Member 4 (Backend Dev) | Member 1 (Project Lead) | Member 6 |
| **Test Suites & CI Pipelines** | Member 6 (AI/Testing) | Member 1 (Project Lead) | Entire Team |

---

## 3. RACI Matrix Across Roadmap Phases

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

| Roadmap Phase | Member 1 (Lead) | Member 2 (FE Lead) | Member 3 (FE Dev) | Member 4 (BE Dev) | Member 5 (DB Dev) | Member 6 (AI/Test) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Phase 1: Blueprint & Architecture** | **A / R** | C | C | C | C | **R** |
| **Phase 2: Repo & Environment Setup** | **A / R** | **R** | I | **R** | I | I |
| **Phase 3: Database Models & Indexes** | A | I | I | C | **R** | C |
| **Phase 4: Auth & Backend Foundation** | A | C | I | **R** | C | C |
| **Phase 5: Product Inventory Module** | A | C | **R** | **R** | C | I |
| **Phase 6: Document Upload & Storage** | A | I | C | **R** | C | C |
| **Phase 7: OCR & Extraction Flow** | A | I | **R** | C | I | **R** |
| **Phase 8: Deadlines & Reminder Jobs** | A | I | C | **R** | C | I |
| **Phase 9: Repairs & Cost Tracker** | A | I | C | C | **R** | I |
| **Phase 10: AI Product Assistant** | A | I | C | C | C | **R** |
| **Phase 11: End-to-End Integration** | **A / R** | **R** | **R** | **R** | **R** | **R** |
| **Phase 12: Security & Full Testing** | A | C | C | C | C | **R** |
| **Phase 13: Deployment & Hosting** | **A / R** | C | I | C | C | I |
| **Phase 14: Final Handoff & Demo** | **A / R** | C | C | C | C | C |

---

## 4. Shared Files & Coordination Protocol

Certain core files impact multiple developers. Direct modifications without prior coordination are strictly prohibited:

- `frontend/src/App.jsx` & `frontend/src/routes/AppRoutes.jsx` (Coordinated by Member 2)
- `backend/src/app.js` & `backend/src/server.js` (Coordinated by Member 4)
- `backend/src/models/*` (Coordinated by Member 5)
- Shared constants & environment templates (Coordinated by Member 1)

### Communication & Sync Schedule
1. **Daily Standup (15 mins):** Each member reports:
   - What was accomplished yesterday.
   - What will be completed today.
   - Blockers or shared file editing needs.
2. **Contract Review Meeting:** Held before introducing new API endpoints or schema modifications.
3. **Pull Request Protocol:** At least one peer review is required before merging into `main`.
