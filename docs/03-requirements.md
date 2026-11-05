# ProofNest — Requirements Specification

---

## 1. Functional Requirements (FR)

### Module 1: Personal Asset Inventory (FR-PAI)
- **FR-PAI-01 (Manual Creation):** The system must allow users to manually create a product record with Name, Brand, Category, Model, Serial Number, Purchase Date, Purchase Price, Currency, Retailer, Description, Image, Warranty Dates, and Return Deadline.
- **FR-PAI-02 (Product Modification):** The system must allow users to edit all metadata fields of an existing product they own.
- **FR-PAI-03 (Product Deletion):** The system must allow users to delete a product. Upon deletion, the user must be prompted with a confirmation dialog detailing associated documents, deadlines, and repair logs that will be purged or unlinked.
- **FR-PAI-04 (Dashboard Listing):** The system must provide a paginated list of all products owned by the user, supporting grid and table views.
- **FR-PAI-05 (Search & Filter):** The system must allow users to search products by name, brand, model, serial number, and retailer, and filter by category and status (active, retired, disposed, returned).
- **FR-PAI-06 (Sorting):** The system must support sorting products by purchase date, purchase price, name, and upcoming warranty expiration.
- **FR-PAI-07 (Product History / Timeline):** The system must assemble and display a chronological history timeline for each product containing its purchase date, attached documents, logged repairs, and scheduled deadlines.

### Module 2: Document Management & AI/OCR Extraction (FR-DOC)
- **FR-DOC-01 (Secure Upload):** The system must support uploading files in PDF, JPEG, PNG, and WEBP formats up to 10 MB in size.
- **FR-DOC-02 (Document Categorization):** Each uploaded document must be categorized as: `invoice`, `warranty`, `manual`, `receipt`, `service`, or `other`.
- **FR-DOC-03 (Product Association):** Documents must be linkable to an existing product or created alongside a new product.
- **FR-DOC-04 (OCR Extraction Pipeline):** Upon invoice upload, the backend must process the document through an OCR and entity extraction pipeline.
- **FR-DOC-05 (Review & Suggestion State):** Extracted values (Retailer, Date, Amount, Currency, Items, Brand, Serial Number) must be saved into a `suggestedFields` structure with extraction status `review_required`.
- **FR-DOC-06 (Mandatory Human Confirmation):** The system must NEVER automatically commit extracted values as verified product or deadline data without an explicit confirmation request (`POST /api/documents/:id/confirm`).
- **FR-DOC-07 (Authorized Download):** The system must allow users to view and download original uploaded files only after validating that the requesting user owns the document record.
- **FR-DOC-08 (Document Deletion):** Deleting a document must remove its database metadata and trigger the removal of the underlying file from storage.

### Module 3: Smart Deadline Calendar (FR-DLC)
- **FR-DLC-01 (Deadline Creation):** Users must be able to create deadlines linked to products for `warranty_expiry`, `return_window`, `maintenance`, or `custom`.
- **FR-DLC-02 (Multi-Stage Reminders):** Users must be able to configure reminder thresholds (e.g., 30 days, 7 days, 1 day before due date).
- **FR-DLC-03 (Calendar & List Views):** The system must display deadlines on an interactive monthly calendar view as well as sorted upcoming and overdue lists.
- **FR-DLC-04 (Automated Scheduler):** A backend scheduled job must evaluate pending deadlines periodically and generate in-app notifications when a reminder threshold matches today's date.
- **FR-DLC-05 (Idempotent Notification):** The scheduler must record `lastNotifiedAt` to guarantee that repeated scheduler executions do not create duplicate notifications for the same reminder threshold.
- **FR-DLC-06 (Status Management):** Users must be able to mark deadlines as `completed` or `dismissed`.

### Module 4: Repair History & Cost Tracker (FR-RPR)
- **FR-RPR-01 (Repair Logging):** Users must be able to log repair events containing Repair Date, Service Center, Issue Description, Work Performed, Cost, Currency, Status, and optional attached invoice/receipt.
- **FR-RPR-02 (Repair Editing & Deletion):** Users must be able to edit or delete any logged repair record they own.
- **FR-RPR-03 (Dynamic Cost Calculation):** The total repair expenditure for a product must be dynamically computed by aggregating the `cost` fields of all stored repair records for that product. Stored running total counters are strictly prohibited.
- **FR-RPR-04 (Multi-Currency Normalization):** If repairs are recorded in multiple currencies, the UI must group totals by currency or convert using user-defined exchange rates.

### Module 5: AI Product Assistant (FR-AIA)
- **FR-AIA-01 (Natural Language Chat):** The system must provide a conversational interface where users can ask questions regarding their products, invoices, warranties, deadlines, and repair costs.
- **FR-AIA-02 (Grounded Information Retrieval):** The assistant must only search within records owned by the authenticated user (`userId`).
- **FR-AIA-03 (Strict Citation):** Every answer generated by the assistant must reference the specific product, invoice, or repair record used as context.
- **FR-AIA-04 (Zero Hallucination / Missing Data Protocol):** If the requested information is absent or unverified in the user's records, the assistant must explicitly declare that it cannot find the information. It must NEVER invent dates, prices, or warranty terms.
- **FR-AIA-05 (Session & History Management):** The assistant must maintain conversation sessions that users can review or clear.

### Module 6: User Authentication & Tenant Isolation (FR-SEC)
- **FR-SEC-01 (User Registration & Login):** Users must register with a unique email and secure password. Passwords must be hashed using bcrypt (cost factor >= 12).
- **FR-SEC-02 (Token Authentication):** Authentication must be maintained using JWT access tokens (15-minute expiration) and refresh tokens (7-day expiration) delivered via `httpOnly`, `SameSite=Lax`, `Secure` cookies.
- **FR-SEC-03 (Strict Data Isolation):** Every database read, write, update, and delete operation across all entities must enforce `userId === req.user.id`.

---

## 2. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Validation Metric |
| :--- | :--- | :--- | :--- |
| **NFR-SEC-01** | Security | Zero cross-tenant data access allowed across any endpoint. | Automated unit/integration tests verifying 403/404 on cross-user resource access. |
| **NFR-SEC-02** | Security | Uploaded files must be validated for magic bytes, extension, and MIME type. | Rejection of renamed executable files (e.g. `.exe` disguised as `.pdf`). |
| **NFR-PERF-01**| Performance | API response time for all CRUD operations must be under 300ms (P95). | Benchmarked via integration test suite with populated database. |
| **NFR-PERF-02**| Performance | Maximum upload payload size enforced at 10 MB. | HTTP 413 Payload Too Large returned when limit is exceeded. |
| **NFR-REL-01** | Reliability | Scheduler must be idempotent and crash-resilient. | Running the reminder job 10 times consecutively produces exactly 1 notification per threshold. |
| **NFR-ACC-01** | Accessibility | UI must conform to WCAG 2.1 Level AA standards. | Semantic HTML, keyboard navigability, color contrast ratio >= 4.5:1. |
| **NFR-RESP-01**| Responsiveness | Layouts must be fully responsive across mobile (>= 375px), tablet (>= 768px), and desktop (>= 1280px). | Verified across standard viewport breakpoints via Tailwind responsive classes. |

---

## 3. Scope Boundaries: MVP vs. Future Scope

```
+----------------------------------------------------------------------------------------------------+
|                                         MVP SCOPE (IN-SCOPE)                                       |
+----------------------------------------------------------------------------------------------------+
| 1. Full Personal Asset Inventory (CRUD, search, filtering, category grouping)                      |
| 2. Secure Document Management (upload, storage, streaming download, association)                   |
| 3. OCR Invoice Processing with mandatory Human-In-The-Loop review & confirmation flow              |
| 4. Smart Deadline Calendar (warranties, return windows, maintenance, in-app notifications)         |
| 5. Repair History Journal & dynamic lifetime repair cost aggregation                               |
| 6. Grounded AI Assistant querying verified user records with source citations                      |
| 7. Secure JWT Authentication with httpOnly cookies and complete tenant isolation                   |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
|                                    FUTURE SCOPE (POST-MVP ONLY)                                    |
+----------------------------------------------------------------------------------------------------+
| 1. External Two-Way Google Calendar / iCal synchronization                                         |
| 2. Direct Email Inbox Ingestion (OAuth Gmail / Outlook integration)                                |
| 3. Multi-User Household Account Sharing and Role-Based Access Control (RBAC)                       |
| 4. Automated One-Click Warranty Claim PDF Pack Generator                                            |
| 5. Asset Resale Valuation & Macro Spending Analytics                                               |
| 6. Public Product Recall and Safety Alert scraping & notifications                                 |
+----------------------------------------------------------------------------------------------------+
```

