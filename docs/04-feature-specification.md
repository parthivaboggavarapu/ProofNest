# ProofNest — Feature Specification

---

## 1. Feature 1: Personal Asset Inventory

### 1.1 Overview
The Personal Asset Inventory module is the core registry where all physical goods owned by the user are cataloged. Every product serves as the parent entity for documents, warranty periods, deadlines, and repair logs.

### 1.2 Data Structure & Field Specifications
| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Required, 2-120 chars | Name or title of the product (e.g. "MacBook Pro 16", "LG OLED C2"). |
| `brand` | String | Required, 1-60 chars | Manufacturer or brand name (e.g. "Apple", "LG", "Sony"). |
| `category` | String (Enum) | Required | One of: `Electronics`, `Appliances`, `Home & Furniture`, `Tools & Garden`, `Automotive`, `Personal & Wearables`, `Other`. |
| `model` | String | Optional, max 80 chars | Specific model identifier or number (e.g. "A2485", "OLED65C2PUA"). |
| `serialNumber` | String | Optional, max 100 chars | Unique hardware serial number or IMEI. |
| `purchaseDate` | Date | Required | Calendar date when the purchase was made. Cannot be in the future. |
| `purchasePrice`| Number | Required, >= 0 | Amount paid for the product (inclusive of tax). |
| `currency` | String | Required, 3 chars | ISO 4217 currency code (e.g. "USD", "EUR", "INR", "GBP"). Default: "USD". |
| `retailer` | String | Optional, max 80 chars | Store, website, or entity from which it was bought (e.g. "Amazon", "Best Buy"). |
| `description` | String | Optional, max 1000 chars | User notes, condition details, accessories included, etc. |
| `imageUrl` | String | Optional | File path or URL to stored product photo. |
| `warrantyStartDate` | Date | Optional | Warranty start date (defaults to `purchaseDate` if not specified). |
| `warrantyExpiryDate`| Date | Optional | Date when the warranty expires. Must be >= `warrantyStartDate`. |
| `returnDeadline` | Date | Optional | Date when the return window closes. Must be >= `purchaseDate`. |
| `status` | String (Enum) | Required | One of: `active` (currently owned), `retired` (out of use), `disposed` (sold/thrown), `returned`. Default: `active`. |

### 1.3 State Transitions & Business Rules
1. **Creation:** A product can be created via manual form input or generated upon confirming an OCR-extracted invoice.
2. **Warranty Synchronization:** When a product is created or updated with `warrantyExpiryDate`, the system automatically upserts an associated deadline record of type `warranty_expiry`.
3. **Return Synchronization:** When a product is created or updated with `returnDeadline`, the system automatically upserts an associated deadline record of type `return_window`.
4. **Deletion Cascade Policy:** When a product is deleted:
   - Associated repair records and deadlines are permanently deleted.
   - Associated documents have their `productId` cleared (orphaned documents remain in the document vault) or are deleted if the user explicitly checks "Delete all attached files".
   - The user must explicitly confirm the deletion modal before the action executes.

---

## 2. Feature 2: Document Management & AI/OCR Extraction

### 2.1 Supported Document Types
- `invoice`: Official bill of sale or purchase receipt.
- `warranty`: Warranty registration card, extended warranty contract, or policy document.
- `manual`: User guide, technical specifications, or assembly instructions PDF.
- `receipt`: Service receipt, parts invoice, or accessory purchase receipt.
- `service`: Maintenance inspection report or warranty repair confirmation.
- `other`: Miscellaneous product-related documentation.

### 2.2 Upload & Storage Workflow
```
[User Selects File] 
       │
       ▼
[Frontend: Validate File Type (PDF/Image) & Size (<=10MB)]
       │
       ▼ (multipart/form-data)
[Backend: Rate Limiter & Magic Byte Verification]
       │
       ▼
[StorageAdapter: Generate UUID Key & Write to Encrypted Storage]
       │
       ▼
[Database: Create Document Record (status: "pending")]
```

### 2.3 The Strict 10-Step Extraction & Confirmation Sequence
To prevent incorrect or hallucinatory OCR data from polluting the user's permanent product inventory, extraction follows a strict human-in-the-loop state machine:

```
  ┌──────────────┐
  │   pending    │  File uploaded; queued for extraction
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  processing  │  OCR engine active; extracting text & entities
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │review_require│  Extraction complete; suggestions saved in document record
  └──────┬───────┘
         │
   User Reviews & Edits in UI
         │
         ▼
  ┌──────────────┐
  │  confirmed   │  User explicitly clicked "Confirm & Save" -> Product created
  └──────────────┘
```

1. **Upload:** User uploads an invoice (PDF or image).
2. **Validation:** Backend verifies format (PDF/JPEG/PNG/WEBP) and file size (<= 10MB).
3. **Storage:** File is persisted to local disk or S3 bucket under an unguessable UUID.
4. **OCR Execution:** `DocumentExtractor.processDocument()` passes file bytes to the OCR engine.
5. **Entity Parsing:** The extraction adapter extracts candidate fields:
   - Store / Merchant name
   - Transaction date
   - Total currency & amount
   - Purchased item names & descriptions
   - Brand, model, and serial numbers (if present)
6. **Suggestion Storage:** Backend updates `Document` record with `extractionStatus: "review_required"` and populates `suggestedFields`.
7. **UI Notification:** Frontend alerts the user that extraction is ready for review.
8. **Review Modal:** The UI displays a side-by-side or stacked view showing the document preview and editable suggestion input fields.
9. **User Correction:** The user inspects the suggestions, corrects misread numbers or typos, and fills any missing values.
10. **Explicit Confirmation:** The user clicks "Confirm & Save". The frontend issues `POST /api/documents/:id/confirm`. Only now are verified `Product` and `Deadline` records written to the database.

---

## 3. Feature 3: Smart Deadline Calendar

### 3.1 Deadline Categories
- `warranty_expiry`: Derived from product manufacturer or extended warranty end date.
- `return_window`: The strict retail return cutoff date.
- `maintenance`: Periodic service schedules (e.g. water filter replacement, car oil change, camera sensor cleaning).
- `custom`: Any user-defined reminder linked to a product.

### 3.2 Reminder Configuration & Scheduling
- Users can assign multiple reminder offsets in days before due date (default presets: `[30, 7, 1]`).
- A background worker (`ReminderJob`) runs on a scheduled cron interval (e.g. hourly or daily at 00:00 UTC).
- **Idempotency Rule:** To prevent duplicate notifications, the job executes the following query:
  ```javascript
  const today = new Date().toISOString().split('T')[0];
  const dueDeadlines = await Deadline.find({
    status: 'pending',
    isConfirmed: true,
    dueDate: { $gte: new Date() }
  });
  ```
- If `(deadline.dueDate - todayInDays)` matches one of the values in `reminderDaysBefore` AND `deadline.lastNotifiedDate !== today`, an in-app `Notification` is created and `deadline.lastNotifiedDate` is updated.

---

## 4. Feature 4: Repair History & Cost Tracker

### 4.1 Repair Record Fields
- `repairDate`: Date the service was performed.
- `serviceCenter`: Service provider name, address, or contact (e.g. "Apple Authorized Service - Geek Squad").
- `issueDescription`: Symptoms or failure mode (e.g. "Cracked glass display, battery draining quickly").
- `workPerformed`: Specific remediation (e.g. "Replaced OLED panel and installed OEM battery").
- `cost`: Currency amount paid.
- `currency`: Currency code.
- `status`: `completed`, `in_progress`, or `pending`.
- `documentId`: Optional link to an attached repair receipt or inspection certificate.

### 4.2 Dynamic Cost Aggregation Specification
The application **MUST NEVER** maintain a manually updated running total field on the `Product` model. Running totals inevitably drift out of sync when records are edited or deleted.

Instead, total repair costs are dynamically calculated using a MongoDB aggregation pipeline:
```javascript
const repairSummary = await Repair.aggregate([
  { $match: { productId: new mongoose.Types.ObjectId(productId), userId: req.user._id } },
  { $group: { _id: "$currency", totalCost: { $sum: "$cost" }, count: { $sum: 1 } } }
]);
```
This guarantees 100% mathematical accuracy across all repair records.

---

## 5. Feature 5: AI Product Assistant

### 5.1 Conversational Capabilities
The assistant provides high-speed, accurate answers to natural language questions regarding the user's personal inventory:
- *"Which products have warranties expiring in the next 60 days?"*
- *"Find the invoice for my Dell monitor."*
- *"How much money have I spent repairing my Toyota over the last 2 years?"*
- *"What is the serial number of my Sony headphones?"*
- *"Do I have any active return deadlines this week?"*

### 5.2 Retrieval & Grounding Rules
1. **User Scope Enforcement:** The retrieval layer executes queries strictly filtered by the authenticated user's ID (`req.user.id`). Under no circumstances can data from another user enter the prompt.
2. **Context Assembly:** Matched products, documents, deadlines, and repair records are serialized into a clean JSON markdown context block.
3. **Citation Requirement:** The LLM prompt requires the model to output bracketed citations referencing specific record IDs: `[Product: 65a12...]` or `[Doc: 65b34...]`. The frontend translates these citations into clickable badges.
4. **Missing Information Protocol:** If the user asks about an item not in their inventory or a repair not logged, the assistant must return:
   > *"I checked your ProofNest records, but I could not find any saved products or documents matching '[query]'. Would you like to add this product or upload its invoice?"*
   Fabricating dates, costs, or warranties is strictly prohibited.
