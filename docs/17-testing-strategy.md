# ProofNest — Testing Strategy & Quality Assurance Blueprint

---

## 1. Testing Pyramid & Coverage Goals

ProofNest enforces a rigorous quality bar across all functional modules. To guarantee mathematical accuracy in financial calculations and absolute tenant isolation, the test strategy spans three tiers:

```
               / \
              /   \
             / E2E \       Playwright Browser Journeys (Critical Flows)
            /-------\
           /  Integ  \     Supertest + MongoMemoryServer (API & Tenant Isolation)
          /-----------\
         /  Unit Tests \   Jest / Vitest (Domain Services, OOP Logic, Schemas)
        /---------------\
```

### Coverage Targets:
- **Domain Services (`ProductService`, `WarrantyTracker`, etc.):** >= 85% branch coverage.
- **API Endpoints & Auth Middleware:** >= 85% branch coverage.
- **Frontend Components & Custom Hooks:** >= 75% coverage.

---

## 2. Test Suite Organization (`tests/`)

```text
tests/
|-- backend/              # Unit tests for domain services, models, validators
|   |-- services/
|   |   |-- ProductService.test.js
|   |   |-- WarrantyTracker.test.js
|   |   |-- RepairHistoryManager.test.js
|   |   |-- DocumentExtractor.test.js
|   |   |-- AiRetrievalService.test.js
|   |-- models/
|   |   |-- User.test.js
|   |   |-- Product.test.js
|   |   |-- Document.test.js
|-- frontend/             # Unit and component tests (Vitest / React Testing Library)
|   |-- components/
|   |   |-- ProductCard.test.jsx
|   |   |-- ExtractionReviewModal.test.jsx
|   |   |-- CalendarGrid.test.jsx
|   |   |-- ChatWindow.test.jsx
|-- integration/          # Supertest API endpoint & tenant isolation tests
|   |-- auth.api.test.js
|   |-- products.api.test.js
|   |-- documents.api.test.js
|   |-- deadlines.api.test.js
|   |-- repairs.api.test.js
|   |-- assistant.api.test.js
|   |-- isolation.api.test.js
|-- e2e/                  # Playwright end-to-end browser journeys
|   |-- user-registration-and-product-entry.spec.js
|   |-- invoice-upload-and-confirmation.spec.js
|   |-- repair-logging-and-expense-check.spec.js
|   |-- ai-assistant-grounding.spec.js
```

---

## 3. Ten Non-Negotiable Integration Test Suites

### Test 1: Cross-User Product Access Isolation (IDOR Test)
- **Setup:** Create User A and User B. User A creates Product A.
- **Action:** User B sends `GET /api/products/:productAId` and `PUT /api/products/:productAId`.
- **Expected Result:** HTTP `404 Not Found`. User B must never view or mutate User A's product.

### Test 2: Cross-User Document Download Isolation
- **Setup:** User A uploads an invoice (`invoiceA.pdf`).
- **Action:** User B requests `GET /api/documents/:docAId/download`.
- **Expected Result:** HTTP `404 Not Found`. File stream is refused.

### Test 3: Unconfirmed OCR Data Invariant
- **Setup:** Upload an invoice file.
- **Action:** OCR finishes with status `review_required` and populates `suggestedFields`. Query `GET /api/products`.
- **Expected Result:** The unconfirmed invoice data must NOT appear in the user's product list. Extracted values must remain in suggestion state only.

### Test 4: Explicit Confirmation Workflow
- **Action:** Issue `POST /api/documents/:id/confirm` with user-edited fields.
- **Expected Result:** HTTP `200 OK`. `Document.extractionStatus` changes to `confirmed`. A new verified `Product` record is created with the exact confirmed values.

### Test 5: Dynamic Repair Expense Aggregation
- **Setup:** Create Product A. Log three repair records:
  - Repair 1: $100.00 USD
  - Repair 2: $50.00 USD
  - Repair 3: $25.50 USD
- **Action:** Call `GET /api/products/:productAId/repair-cost`.
- **Expected Result:** Response shows exact total: `$175.50 USD`.
- **Action 2:** Delete Repair 2. Re-query cost.
- **Expected Result:** Response dynamically updates to `$125.50 USD`.

### Test 6: AI Assistant Grounded Retrieval & Citation
- **Setup:** User owns "Bose QC45 Headphones" with a purchase price of $329.
- **Action:** User asks: *"How much did I pay for my Bose headphones?"*
- **Expected Result:** Answer explicitly contains "$329" and cites `[Product: <id>]`.

### Test 7: AI Assistant Absence Protocol (Zero Hallucination)
- **Setup:** User has no records for a "PlayStation 5".
- **Action:** User asks: *"When does the warranty on my PlayStation 5 expire?"*
- **Expected Result:** Assistant must explicitly state that no PlayStation 5 was found in records. It must NEVER invent a purchase date or warranty.

### Test 8: Scheduler Idempotency Test
- **Setup:** Create a deadline due in 7 days with reminder offsets `[7, 1]`.
- **Action:** Execute the reminder scheduler job 5 times consecutively on the 7th day.
- **Expected Result:** Exactly ONE in-app notification is created. `lastNotifiedAt` is updated on the first run; subsequent runs detect the match and skip.

### Test 9: Cascade Delete Policy
- **Setup:** Create Product A with 2 attached deadlines and 2 repair records.
- **Action:** Issue `DELETE /api/products/:productAId`.
- **Expected Result:** Deadlines and repairs for Product A are deleted from the database.

### Test 10: File Upload Security & Size Gate
- **Action A:** Upload a 15 MB file. -> **Expected:** HTTP `413 Payload Too Large`.
- **Action B:** Upload an `.exe` file renamed to `invoice.pdf`. -> **Expected:** HTTP `422 Unprocessable Entity` (magic byte validation rejection).
