# ProofNest — Formal Acceptance Criteria (Given-When-Then)

---

## 1. Acceptance Criteria Index

- **AC-01:** User Registration, Authentication & Token Refresh
- **AC-02:** Manual Product Creation, Search & Category Filtering
- **AC-03:** Document Upload, Validation & Authorized Streaming
- **AC-04:** Invoice OCR Extraction & Mandatory Human Confirmation
- **AC-05:** Smart Deadlines & Idempotent Reminder Scheduling
- **AC-06:** Repair History Logging & Dynamic Expense Aggregation
- **AC-07:** Grounded AI Assistant Question Answering & Citations
- **AC-08:** AI Absence Handling (Zero Hallucination Protocol)
- **AC-09:** Cross-Tenant Data Isolation (Zero Leakage)
- **AC-10:** Product Deletion & File Cleanup Policy

---

## 2. Detailed Criteria

### AC-01: User Registration, Authentication & Token Refresh
- **Scenario 1: Successful Registration**
  - **Given** an unauthenticated guest user with valid email, full name, and strong password.
  - **When** submitting `POST /api/auth/register`.
  - **Then** a new user document is created with a bcrypt-hashed password, and the server returns `201 Created` with user profile data.
- **Scenario 2: Secure Cookie Delivery on Login**
  - **Given** an existing registered user.
  - **When** submitting valid credentials to `POST /api/auth/login`.
  - **Then** the response sets `proofnest_access_token` and `proofnest_refresh_token` in `httpOnly`, `SameSite=Lax` cookies, returning `200 OK`.

---

### AC-02: Manual Product Creation, Search & Category Filtering
- **Scenario 1: Product Creation with Valid Fields**
  - **Given** an authenticated user on the Add Product page.
  - **When** filling Name, Brand, Category, Purchase Date, and Price, and submitting `POST /api/products`.
  - **Then** a product document scoped to `req.user.id` is created, and the product list includes the new item.
- **Scenario 2: Category and Brand Filtering**
  - **Given** an authenticated user with products across "Electronics" and "Appliances".
  - **When** calling `GET /api/products?category=Electronics`.
  - **Then** only products matching "Electronics" and owned by the user are returned.

---

### AC-03: Document Upload, Validation & Authorized Streaming
- **Scenario 1: Valid PDF Upload**
  - **Given** an authenticated user and a valid 2 MB invoice PDF.
  - **When** uploading to `POST /api/documents/upload`.
  - **Then** the file is stored under an unguessable UUID key, and a document record is created with `extractionStatus: 'pending'`.
- **Scenario 2: Oversized File Rejection**
  - **Given** a file exceeding 10 MB.
  - **When** attempting upload to `POST /api/documents/upload`.
  - **Then** the server immediately returns `413 Payload Too Large`.
- **Scenario 3: Authorized Streaming Download**
  - **Given** an uploaded document owned by User A.
  - **When** User A requests `GET /api/documents/:id/download`.
  - **Then** the server streams the file with `Content-Disposition: attachment`.

---

### AC-04: Invoice OCR Extraction & Mandatory Human Confirmation
- **Scenario 1: OCR Extraction Suggestion State**
  - **Given** an uploaded invoice PDF.
  - **When** the OCR pipeline finishes processing.
  - **Then** `Document.extractionStatus` becomes `review_required`, populating `suggestedFields`.
  - **And** no new verified `Product` record exists yet in the database.
- **Scenario 2: Explicit User Confirmation**
  - **Given** an extraction in `review_required` state.
  - **When** the user edits suggested fields in the modal and clicks "Confirm & Save" (`POST /api/documents/:id/confirm`).
  - **Then** `Document.extractionStatus` updates to `confirmed`.
  - **And** a new verified `Product` record is created containing the user-confirmed data.

---

### AC-05: Smart Deadlines & Idempotent Reminder Scheduling
- **Scenario 1: Warranty Deadline Auto-Generation**
  - **Given** a product saved with a `warrantyExpiryDate`.
  - **When** the product is saved or confirmed.
  - **Then** an associated `Deadline` record of type `warranty_expiry` is automatically created with the same due date.
- **Scenario 2: Scheduler Idempotency**
  - **Given** a deadline with a reminder threshold matching today's date.
  - **When** the background reminder scheduler runs multiple times on the same day.
  - **Then** exactly ONE in-app notification is created, and `lastNotifiedAt` records the execution date.

---

### AC-06: Repair History Logging & Dynamic Expense Aggregation
- **Scenario 1: Dynamic Aggregation Accuracy**
  - **Given** a product with two logged repairs ($120.00 USD and $80.00 USD).
  - **When** requesting `GET /api/products/:id/repair-cost`.
  - **Then** the response reports total cost as `$200.00 USD` computed via dynamic aggregation.
- **Scenario 2: Deletion Recalculation**
  - **Given** the product above.
  - **When** the $80.00 repair record is deleted.
  - **Then** subsequent calls to `/repair-cost` immediately reflect `$120.00 USD`.

---

### AC-07: Grounded AI Assistant Question Answering & Citations
- **Scenario 1: Answer Grounded in User Records**
  - **Given** an authenticated user who owns a "Sony TV" bought for $1,200.
  - **When** the user asks: *"What was the purchase price of my Sony TV?"*.
  - **Then** the AI assistant responds with "$1,200" and includes a citation pill linking `[Product: <sony_tv_id>]`.

---

### AC-08: AI Absence Handling (Zero Hallucination Protocol)
- **Scenario 1: Missing Record Handling**
  - **Given** an authenticated user with no records for a "Dyson Vacuum".
  - **When** the user asks: *"When does the warranty on my Dyson vacuum expire?"*.
  - **Then** the assistant states that it checked the user's records and found no matching item.
  - **And** the assistant does NOT invent any dates or warranty terms.

---

### AC-09: Cross-Tenant Data Isolation (Zero Leakage)
- **Scenario 1: Cross-User Resource Access Defense**
  - **Given** User A owns Product 123.
  - **When** User B (authenticated as User B) sends `GET /api/products/123`.
  - **Then** the server responds with `404 Not Found`.

---

### AC-10: Product Deletion & File Cleanup Policy
- **Scenario 1: Product Deletion Cascade**
  - **Given** a product with attached deadlines and repair records.
  - **When** the user confirms deletion via `DELETE /api/products/:id`.
  - **Then** the product, associated deadlines, and repair records are permanently removed from the database.
  - **And** attached documents have their `productId` cleared or are deleted if `deleteFiles=true` is requested.
