# ProofNest — REST API Specification

---

## 1. Global API Conventions

### 1.1 Base URL & Content Negotiation
- **Base URL:** `/api/v1` (or `/api` in development proxy)
- **Protocol:** HTTPS only (enforced via reverse proxy / Helmet)
- **Content-Type:** `application/json` (except file uploads using `multipart/form-data`)

### 1.2 Authentication & Credentials
- All protected endpoints require a valid JWT token.
- Tokens are transmitted via secure, `httpOnly`, `SameSite=Lax` cookies named `proofnest_access_token` and `proofnest_refresh_token`.
- Frontend clients configure HTTP libraries with `withCredentials: true`.

### 1.3 Standard Response Format
All JSON responses follow a consistent envelope structure:

#### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

#### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted payload failed validation checks.",
    "details": [
      {
        "field": "purchasePrice",
        "message": "Purchase price must be a positive number."
      }
    ]
  }
}
```

### 1.4 Standard HTTP Status Codes
- `200 OK`: Request succeeded; response contains requested data.
- `201 Created`: Resource successfully created.
- `204 No Content`: Resource deleted or action completed without return body.
- `400 Bad Request`: Malformed JSON or syntax failure.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated user does not have permission for the resource.
- `404 Not Found`: Resource does not exist or does not belong to the user.
- `413 Payload Too Large`: Upload exceeds the 10 MB limit.
- `422 Unprocessable Entity`: Input failed schema validation rules.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server encountered an unexpected error.

---

## 2. Authentication Endpoints

### 2.1 Register User
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullName": "Jane Doe",
    "preferredCurrency": "USD"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "65a000000000000000000002",
        "email": "user@example.com",
        "fullName": "Jane Doe",
        "preferredCurrency": "USD"
      }
    }
  }
  ```

### 2.2 Login User
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  Sets `proofnest_access_token` and `proofnest_refresh_token` in cookies.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "65a000000000000000000002",
        "email": "user@example.com",
        "fullName": "Jane Doe",
        "preferredCurrency": "USD"
      }
    }
  }
  ```

### 2.3 Logout User
- **Method:** `POST`
- **URL:** `/api/auth/logout`
- **Auth Required:** Yes
- **Response (200 OK):** Clears authentication cookies.
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out." }
  }
  ```

### 2.4 Get Current User Profile
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "65a000000000000000000002",
        "email": "user@example.com",
        "fullName": "Jane Doe",
        "preferredCurrency": "USD",
        "notificationPreferences": {
          "emailAlerts": false,
          "inAppAlerts": true,
          "reminderDays": [30, 7, 1]
        }
      }
    }
  }
  ```

---

## 3. Product Endpoints

### 3.1 List Products
- **Method:** `GET`
- **URL:** `/api/products`
- **Auth Required:** Yes
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 12)
  - `search` (string, searches name/brand/model)
  - `category` (string, filter by category)
  - `brand` (string, filter by brand)
  - `status` (string, default: `active`)
  - `sort` (string, e.g. `-purchaseDate`, `purchasePrice`, `name`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "65a111111111111111111111",
        "name": "MacBook Pro 16\"",
        "brand": "Apple",
        "category": "Electronics",
        "model": "A2485",
        "serialNumber": "C02G1234MD6R",
        "purchaseDate": "2025-11-20T00:00:00.000Z",
        "purchasePrice": 3499.00,
        "currency": "USD",
        "retailer": "Apple Store",
        "warrantyExpiryDate": "2028-11-20T00:00:00.000Z",
        "status": "active"
      }
    ],
    "meta": { "page": 1, "limit": 12, "total": 1 }
  }
  ```

### 3.2 Create Product (Manual)
- **Method:** `POST`
- **URL:** `/api/products`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "name": "Sony WH-1000XM5 Headphones",
    "brand": "Sony",
    "category": "Electronics",
    "model": "WH1000XM5/B",
    "serialNumber": "5091823",
    "purchaseDate": "2026-02-10T00:00:00.000Z",
    "purchasePrice": 399.99,
    "currency": "USD",
    "retailer": "Best Buy",
    "warrantyExpiryDate": "2027-02-10T00:00:00.000Z",
    "returnDeadline": "2026-02-25T00:00:00.000Z"
  }
  ```
- **Response (201 Created):** Returns created product object.

### 3.3 Get Single Product Details
- **Method:** `GET`
- **URL:** `/api/products/:id`
- **Auth Required:** Yes
- **Response (200 OK):** Returns full product object with populated counts of documents, deadlines, and repair costs.

### 3.4 Update Product
- **Method:** `PUT`
- **URL:** `/api/products/:id`
- **Auth Required:** Yes
- **Request Body:** JSON payload with updated fields.
- **Response (200 OK):** Returns updated product object.

### 3.5 Delete Product
- **Method:** `DELETE`
- **URL:** `/api/products/:id?deleteFiles=false`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Product and associated deadlines/repairs successfully deleted." }
  }
  ```

---

## 4. Document Endpoints & Extraction Pipeline

### 4.1 Upload Document
- **Method:** `POST`
- **URL:** `/api/documents/upload`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: (Binary file stream: PDF, JPEG, PNG, WEBP)
  - `productId`: (Optional ObjectId string)
  - `fileType`: (Enum: `invoice`, `warranty`, `manual`, `receipt`, `service`, `other`)
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "65b222222222222222222222",
      "originalName": "invoice.pdf",
      "fileType": "invoice",
      "fileSize": 248910,
      "extractionStatus": "pending"
    }
  }
  ```

### 4.2 Trigger Document Extraction
- **Method:** `POST`
- **URL:** `/api/documents/:id/extract`
- **Auth Required:** Yes
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "data": {
      "id": "65b222222222222222222222",
      "extractionStatus": "processing",
      "message": "Document OCR extraction queued."
    }
  }
  ```

### 4.3 Get Extraction Suggestions
- **Method:** `GET`
- **URL:** `/api/documents/:id/extraction`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "documentId": "65b222222222222222222222",
      "extractionStatus": "review_required",
      "suggestedFields": {
        "merchant": "Best Buy #421",
        "date": "2026-02-10T00:00:00.000Z",
        "totalAmount": 399.99,
        "currency": "USD",
        "itemName": "Sony WH-1000XM5 Wireless Headphones",
        "brand": "Sony",
        "model": "WH1000XM5/B",
        "serialNumber": "5091823",
        "warrantyPeriodMonths": 12
      }
    }
  }
  ```

### 4.4 Confirm Extracted Information (Promote to Verified Data)
- **Method:** `POST`
- **URL:** `/api/documents/:id/confirm`
- **Auth Required:** Yes
- **Request Body (User-Reviewed & Corrected Values):**
  ```json
  {
    "createProduct": true,
    "productData": {
      "name": "Sony WH-1000XM5 Headphones",
      "brand": "Sony",
      "category": "Electronics",
      "model": "WH1000XM5/B",
      "serialNumber": "5091823",
      "purchaseDate": "2026-02-10T00:00:00.000Z",
      "purchasePrice": 399.99,
      "currency": "USD",
      "retailer": "Best Buy",
      "warrantyExpiryDate": "2027-02-10T00:00:00.000Z",
      "returnDeadline": "2026-02-25T00:00:00.000Z"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Extraction confirmed and verified product records created.",
      "product": { "id": "65a111111111111111111112", "name": "Sony WH-1000XM5 Headphones" },
      "document": { "id": "65b222222222222222222222", "extractionStatus": "confirmed" }
    }
  }
  ```

### 4.5 Download Document (Authorized Streaming)
- **Method:** `GET`
- **URL:** `/api/documents/:id/download`
- **Auth Required:** Yes
- **Response:** Binary stream with `Content-Disposition: attachment; filename="originalName.pdf"`.

---

## 5. Deadline & Reminder Endpoints

### 5.1 Create Deadline
- **Method:** `POST`
- **URL:** `/api/deadlines`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "productId": "65a111111111111111111111",
    "title": "HVAC Filter Replacement",
    "deadlineType": "maintenance",
    "dueDate": "2026-08-01T00:00:00.000Z",
    "reminderDaysBefore": [14, 3, 1]
  }
  ```
- **Response (201 Created):** Returns created deadline object.

### 5.2 List Upcoming Deadlines
- **Method:** `GET`
- **URL:** `/api/deadlines/upcoming?days=30`
- **Auth Required:** Yes
- **Response (200 OK):** Array of deadlines due within the specified window.

### 5.3 Update / Complete Deadline
- **Method:** `PUT` / `PATCH`
- **URL:** `/api/deadlines/:id` or `/api/deadlines/:id/complete`
- **Auth Required:** Yes

---

## 6. Repair History & Cost Endpoints

### 6.1 Log a Repair
- **Method:** `POST`
- **URL:** `/api/repairs`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "productId": "65a111111111111111111111",
    "repairDate": "2026-05-10T00:00:00.000Z",
    "serviceCenter": "Local iFixit Shop",
    "issueDescription": "USB-C port loose and not charging",
    "workPerformed": "Cleaned debris and replaced USB-C daughterboard",
    "cost": 120.00,
    "currency": "USD",
    "status": "completed"
  }
  ```
- **Response (201 Created):** Returns created repair record.

### 6.2 Get Dynamic Repair Cost Total for Product
- **Method:** `GET`
- **URL:** `/api/products/:id/repair-cost`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "productId": "65a111111111111111111111",
      "totalRepairs": 2,
      "breakdown": [
        {
          "currency": "USD",
          "totalCost": 120.00
        }
      ]
    }
  }
  ```

---

## 7. AI Product Assistant Endpoints

### 7.1 Ask Question
- **Method:** `POST`
- **URL:** `/api/assistant/ask`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "query": "How much have I spent repairing my laptop?",
    "conversationId": "65e555555555555555555555" // optional
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "answer": "According to your records, you have logged 1 repair for your MacBook Pro 16\" [Product: 65a111111111111111111111] for a total of $120.00 USD on May 10, 2026.",
      "citations": {
        "products": [
          { "id": "65a111111111111111111111", "name": "MacBook Pro 16\"" }
        ],
        "repairs": [
          { "id": "65d444444444444444444444", "cost": 120.00, "currency": "USD" }
        ],
        "documents": []
      }
    }
  }
  ```

### 7.2 Get Conversation History
- **Method:** `GET`
- **URL:** `/api/assistant/history`
- **Auth Required:** Yes

---

## 8. Dashboard Aggregation Endpoint

### 8.1 Get Dashboard Summary Metrics
- **Method:** `GET`
- **URL:** `/api/dashboard/summary`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "totalProducts": 14,
      "expiringWarrantiesCount": 2,
      "activeReturnDeadlinesCount": 1,
      "totalSpentRepairs": {
        "USD": 340.00
      },
      "recentProducts": [ ... ],
      "upcomingDeadlines": [ ... ],
      "unreadNotifications": 3
    }
  }
  ```

