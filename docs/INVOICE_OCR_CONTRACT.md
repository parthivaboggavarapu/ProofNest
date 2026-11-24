# ProofNest — n8n Invoice OCR Integration Contract

This document specifies the exact contract for connecting n8n workflows with the ProofNest Express backend.

---

## 1. Complete Workflow Lifecycle

```text
React Frontend (User)
       |
       | 1. Upload Invoice File (PDF, PNG, JPG, WebP)
       v
Express Backend: POST /api/documents/upload (or /api/integrations/n8n/document-processing)
       |
       | 2. Validates magic bytes & saves binary in MongoDB GridFS
       | 3. Creates ProcessingJob with status: "pending"
       | 4. Generates short-lived tokenized download URL (?token=...)
       v
n8n Webhook: POST $N8N_DOCUMENT_PROCESSING_WEBHOOK
       |
       | 5. n8n downloads binary stream from Express
       | 6. n8n extracts invoice text & fields (OCR / LLM)
       v
Express Backend Callback: POST /api/integrations/n8n/document-processing/callback
       |
       | 7. Authenticated via Header Auth: X-ProofNest-Webhook-Secret
       | 8. Sanitizes fields & marks ProcessingJob status: "completed"
       |    (awaitingUserConfirmation: true)
       | 9. Auto-ingests raw text chunks into DocumentChunk for RAG
       v
React Frontend (User)
       |
       | 10. Polls GET /api/integrations/n8n/jobs/:jobId
       | 11. Displays extracted fields on review screen for user confirmation
       v
Express Backend: POST /api/integrations/n8n/confirm-ocr
       |
       | 12. Validates user input & updates/creates Product record
       | 13. Links GridFS Document to confirmed Product
```

---

## 2. Inbound Webhook Payload (Express -> n8n)

When an invoice is submitted, Express triggers the webhook configured at `N8N_DOCUMENT_PROCESSING_WEBHOOK`:

### Request Details
- **Method:** `POST`
- **URL:** `${N8N_DOCUMENT_PROCESSING_WEBHOOK}` (e.g., `http://localhost:5678/webhook/proofnest-ocr-process`)
- **Headers:**
  - `Content-Type: application/json`
  - `X-ProofNest-Webhook-Secret: <N8N_WEBHOOK_SECRET>`

### JSON Payload Schema
```json
{
  "jobId": "job_ocr_1795532934770_c7bddc78",
  "documentId": "6743328e10c79ab0e199f1a2",
  "fileName": "bestbuy_invoice.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "downloadUrl": "http://host.docker.internal:5000/api/integrations/n8n/documents/6743328e10c79ab0e199f1a2/download?token=6743328e10c79ab0e199f1a2:1795533534:a84f...",
  "callbackUrl": "http://host.docker.internal:5000/api/integrations/n8n/document-processing/callback",
  "productContext": {
    "productId": "6743328e10c79ab0e199f1a0",
    "productName": "MacBook Pro",
    "brand": "Apple",
    "modelNumber": "A2991",
    "category": "Electronics"
  }
}
```
*Note: `productContext` will be `null` if the invoice is uploaded before associating it with a known product.*

---

## 3. Secure File Retrieval by n8n
Inside n8n, use an **HTTP Request** node to fetch the invoice binary:
- **Method:** `GET`
- **URL:** Expression `{{ $json.downloadUrl }}`
- **Authentication:** None required (access is scoped and secured by the short-lived cryptographic token in the URL).

---

## 4. n8n Callback Contract (n8n -> Express)

Once OCR text and fields have been extracted, n8n sends an HTTP request back to Express.

### Request Details
- **Method:** `POST`
- **URL:** `http://host.docker.internal:5000/api/integrations/n8n/document-processing/callback`
- **Authentication Header:**
  - `X-ProofNest-Webhook-Secret: <N8N_WEBHOOK_SECRET>`

### Success Payload Schema
```json
{
  "jobId": "job_ocr_1795532934770_c7bddc78",
  "status": "completed",
  "rawText": "Best Buy Tax Invoice #INV-BB-889911 Apple MacBook Pro 16-inch $2499.00 ...",
  "extractedData": {
    "productName": "MacBook Pro 16-inch",
    "brand": "Apple",
    "modelNumber": "A2991",
    "serialNumber": "C02G41KSMD6R",
    "purchaseDate": "2026-03-15",
    "purchasePrice": 2499.00,
    "seller": "Best Buy Store #102",
    "invoiceNumber": "INV-BB-889911",
    "warrantyExpiry": "2027-03-15"
  }
}
```

### Failure Payload Schema (in case of OCR/LLM error)
```json
{
  "jobId": "job_ocr_1795532934770_c7bddc78",
  "status": "failed",
  "error": "OCR extraction failed: document unreadable or corrupted"
}
```

### Supported Fields in `extractedData`:
| Field | Type | Description |
|---|---|---|
| `productName` | `string` | Name or title of the product |
| `brand` | `string` | Manufacturer / brand name |
| `modelNumber` | `string` | Model or catalog identifier |
| `serialNumber` | `string` | Unit serial number if present |
| `purchaseDate` | `string` | ISO Date `YYYY-MM-DD` |
| `purchasePrice` | `number` | Numeric purchase price (e.g. `2499.00`) |
| `seller` | `string` | Retailer or merchant name |
| `invoiceNumber` | `string` | Invoice or receipt reference code |
| `warrantyExpiry`| `string` | ISO Date `YYYY-MM-DD` |
| `warrantyDuration` | `string` | E.g., `"1 year"`, `"24 months"` (if date not explicitly calculated) |

---

## 5. User Confirmation & Persistence Contract

OCR extraction results are **never applied automatically** to the database without explicit user confirmation.

### 1. Polling Job Status
- **Method:** `GET /api/integrations/n8n/jobs/:jobId`
- **Auth:** User Bearer JWT
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job_ocr_1795532934770_c7bddc78",
      "status": "completed",
      "type": "ocr_extraction",
      "result": {
        "extractedData": {
          "productName": "MacBook Pro 16-inch",
          "brand": "Apple",
          "purchasePrice": 2499
        },
        "awaitingUserConfirmation": true
      }
    }
  }
  ```

### 2. User Confirmation Endpoint
- **Method:** `POST /api/integrations/n8n/confirm-ocr`
- **Auth:** User Bearer JWT
- **Payload:**
  ```json
  {
    "jobId": "job_ocr_1795532934770_c7bddc78",
    "confirmedProductData": {
      "productName": "MacBook Pro 16-inch",
      "brand": "Apple",
      "modelNumber": "A2991",
      "category": "Electronics",
      "serialNumber": "C02G41KSMD6R",
      "purchaseDate": "2026-03-15",
      "purchasePrice": 2499.00,
      "seller": "Best Buy Store #102",
      "warrantyExpiry": "2027-03-15",
      "notes": "Confirmed from original store receipt"
    }
  }
  ```
- **Response (`200 OK`):**
  - Creates or updates the `Product` record in MongoDB.
  - Links the `Document` to the `Product`.
  - Sets `awaitingUserConfirmation: false` on the `ProcessingJob`.
