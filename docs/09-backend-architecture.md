# ProofNest — Backend Architecture & Service Blueprint

---

## 1. Architectural Philosophy & Layering

The ProofNest backend is built with **Node.js** and **Express.js** following the principles of **Object-Oriented Domain Driven Design (DDD)** and clear separation of concerns. 

To prevent sprawling, unmaintainable route handlers, business logic is strictly encapsulated inside specialized **Service Classes**. Route handlers (controllers) are thin orchestrators responsible only for:
1. Extracting parameters, query strings, headers, and body payloads.
2. Invoking the appropriate domain service method.
3. Returning standard HTTP status codes and response envelopes.

```
+-------------------------------------------------------------------------+
|                           HTTP REQUEST PIPELINE                         |
+-------------------------------------------------------------------------+
| 1. Security & Edge Middleware (Helmet, CORS, RateLimiter, CookieParser)  |
| 2. Authentication Middleware (Verify JWT, Attach req.user)              |
| 3. Input Validation Middleware (Express-Validator schemas)              |
| 4. Express Route Handlers & Controllers                                 |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                       OOP DOMAIN SERVICE LAYER                          |
+-------------------------------------------------------------------------+
| * ProductService         * WarrantyTracker        * RepairHistoryMgr    |
| * DocumentExtractor      * DeadlineService        * NotificationService |
| * AiRetrievalService     * DashboardService                             |
+-------------------------------------------------------------------------+
            │                                              │
            ▼                                              ▼
+-----------------------+                      +--------------------------+
|  Mongoose Models & DB |                      |    Integration Adapters  |
|  (Persistence Layer)  |                      | (Storage, OCR, LLM, Mail)|
+-----------------------+                      +--------------------------+
```

---

## 2. Directory Layout (`backend/src/`)

```text
backend/src/
|-- config/               # database.js, env.js, storage.js, constants.js
|-- constants/            # errorCodes.js, regexes.js, defaultCategories.js
|-- controllers/          # authController.js, productController.js, documentController.js,
|                         # deadlineController.js, repairController.js, assistantController.js,
|                         # dashboardController.js, notificationController.js
|-- integrations/
|   |-- storage/          # StorageAdapter.js, LocalStorageAdapter.js, S3StorageAdapter.js
|   |-- ocr/              # OcrAdapter.js, TesseractAdapter.js, CloudOcrAdapter.js
|   |-- llm/              # LlmAdapter.js, OpenAiAdapter.js, AnthropicAdapter.js
|   |-- notifications/    # EmailAdapter.js, SmtpEmailAdapter.js
|-- jobs/                 # reminderScheduler.js, cleanupJob.js
|-- middleware/           # authMiddleware.js, uploadMiddleware.js, validateMiddleware.js,
|                         # rateLimitMiddleware.js, errorMiddleware.js
|-- models/               # User.js, Product.js, Document.js, Deadline.js,
|                         # Repair.js, Notification.js, AiConversation.js
|-- routes/               # authRoutes.js, productRoutes.js, documentRoutes.js,
|                         # deadlineRoutes.js, repairRoutes.js, assistantRoutes.js,
|                         # dashboardRoutes.js, notificationRoutes.js, index.js
|-- services/             # ProductService.js, WarrantyTracker.js, RepairHistoryManager.js,
|                         # DocumentExtractor.js, DeadlineService.js, NotificationService.js,
|                         # AiRetrievalService.js, DashboardService.js
|-- utils/                # logger.js, responseFormatter.js, dateHelpers.js, fileHelpers.js
|-- validators/           # authValidator.js, productValidator.js, documentValidator.js,
|                         # deadlineValidator.js, repairValidator.js, assistantValidator.js
|-- app.js                # Express app setup and middleware assembly
|-- server.js             # HTTP listener and database connection bootstrap
```

---

## 3. Required OOP Domain Service Classes

### 3.1 `ProductService`
Handles the lifecycle, retrieval, search filtering, and history assembly for products.

```javascript
class ProductService {
  /**
   * Creates a new product record scoped to the authenticated user.
   * Automatically invokes WarrantyTracker to create associated deadlines if dates provided.
   */
  async createProduct(productData, userId) { ... }

  /**
   * Retrieves paginated products with filtering by category, brand, and search string.
   */
  async getProducts(userId, filters = {}, pagination = { page: 1, limit: 12 }, sort = '-createdAt') { ... }

  /**
   * Retrieves single product by ID, verifying tenant ownership.
   */
  async getProductById(productId, userId) { ... }

  /**
   * Updates an existing product and recalculates associated deadlines.
   */
  async updateProduct(productId, updateData, userId) { ... }

  /**
   * Deletes a product, cascading deletions to deadlines/repairs and applying document policy.
   */
  async deleteProduct(productId, userId, deleteFiles = false) { ... }

  /**
   * Assembles a unified chronological timeline of all events (purchase, documents, repairs, deadlines).
   */
  async getProductTimeline(productId, userId) { ... }
}
```

---

### 3.2 `WarrantyTracker`
Specialized service responsible for calculating warranty boundaries, return windows, and auto-generating deadline records.

```javascript
class WarrantyTracker {
  /**
   * Evaluates the active warranty status of a product.
   * Returns: { status: 'active' | 'expiring_soon' | 'expired' | 'none', daysRemaining: number }
   */
  calculateWarrantyStatus(warrantyExpiryDate) { ... }

  /**
   * Calculates whether a return window is still open.
   * Returns: { isOpen: boolean, daysRemaining: number }
   */
  calculateReturnWindow(returnDeadline) { ... }

  /**
   * Synchronizes Product dates with the Deadline collection.
   * Ensures an active 'warranty_expiry' deadline exists matching product.warrantyExpiryDate.
   */
  async syncProductDeadlines(product, userId) { ... }

  /**
   * Queries products owned by user whose warranty expires within N days.
   */
  async getUpcomingExpiringWarranties(userId, thresholdDays = 30) { ... }
}
```

---

### 3.3 `RepairHistoryManager`
Handles maintenance and repair logging and provides dynamic, mathematically guaranteed expense calculations.

```javascript
class RepairHistoryManager {
  /**
   * Logs a new repair entry linked to a product.
   */
  async logRepair(repairData, userId) { ... }

  /**
   * Updates an existing repair record with tenant verification.
   */
  async updateRepair(repairId, updateData, userId) { ... }

  /**
   * Deletes a repair record.
   */
  async deleteRepair(repairId, userId) { ... }

  /**
   * Retrieves chronological repair history for a specific product.
   */
  async getRepairsByProduct(productId, userId) { ... }

  /**
   * Dynamically aggregates total repair expenses for a product using MongoDB aggregation pipeline.
   * Returns: { productId, totalRepairs: number, breakdown: [ { currency: 'USD', totalCost: 120.00 } ] }
   */
  async calculateTotalRepairExpenses(productId, userId) { ... }

  /**
   * Aggregates total repair expenses across ALL products for the user (for dashboard display).
   */
  async calculateUserLifetimeRepairExpenses(userId) { ... }
}
```

---

### 3.4 `DocumentExtractor`
Orchestrates file storage, triggers OCR entity extraction, normalizes suggestions, and guides the human confirmation workflow.

```javascript
class DocumentExtractor {
  constructor(storageAdapter, ocrAdapter) {
    this.storage = storageAdapter;
    this.ocr = ocrAdapter;
  }

  /**
   * Saves uploaded file via StorageAdapter and registers initial Document record (status: 'pending').
   */
  async registerDocument(fileBuffer, metadata, userId) { ... }

  /**
   * Asynchronous worker method: fetches file, invokes OCR, extracts entities, and sets status: 'review_required'.
   */
  async processDocument(documentId, userId) { ... }

  /**
   * Normalizes raw text from OCR adapter into structured suggestedFields (dates, prices, merchant).
   */
  normalizeExtractedFields(rawOcrPayload) { ... }

  /**
   * Human confirmation step: receives user-reviewed data, marks Document status: 'confirmed',
   * and creates verified Product and Deadline records.
   */
  async confirmExtraction(documentId, reviewedData, userId) { ... }
}
```

---

### 3.5 `AiRetrievalService`
Provides grounded, hallucination-resistant answers to user queries regarding their personal product records.

```javascript
class AiRetrievalService {
  constructor(llmAdapter) {
    this.llm = llmAdapter;
  }

  /**
   * Main query pipeline:
   * 1. Detect query intent and entities.
   * 2. Execute user-scoped database search (Products, Repairs, Deadlines, Documents).
   * 3. Construct grounded prompt with records and citation IDs.
   * 4. Call LLMAdapter with strict grounding system instructions.
   * 5. Extract citations, persist conversation, and return structured response.
   */
  async askQuestion(query, userId, conversationId = null) { ... }

  /**
   * User-scoped context retriever. Enforces userId on all queries.
   */
  async retrieveContext(userId, searchKeywords, intent) { ... }
}
```

---

## 4. Error Handling & Standardized Responses

Express error handling is centralized in `errorMiddleware.js`. All service classes throw instances of `AppError`:

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}
```

### Standard Error Translation
1. `Mongoose ValidationError` -> Returns `422 Unprocessable Entity` with array of invalid fields.
2. `Mongoose CastError` -> Returns `404 Not Found` (invalid ObjectId).
3. `JsonWebTokenError` / `TokenExpiredError` -> Returns `401 Unauthorized`.
4. `MulterError` (e.g. `LIMIT_FILE_SIZE`) -> Returns `413 Payload Too Large`.
5. Uncaught exceptions in production -> Returns `500 Internal Server Error` with generic message while logging full stack trace server-side.
