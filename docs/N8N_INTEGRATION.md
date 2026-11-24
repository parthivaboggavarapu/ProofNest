# ProofNest & n8n Integration Guide

## 1. Architecture Overview

ProofNest uses **Express.js** as the authoritative backend handling user authentication (JWT), data persistence (MongoDB Atlas), and binary storage (GridFS). **n8n Community Edition** runs locally inside Docker as an orchestration engine for AI workflows, OCR document processing, and scheduled warranty reminders.

```text
React Frontend (Port 5173)
       |
       v (Bearer JWT Authentication)
Node.js + Express Backend (Port 5000)
       |
       +----> MongoDB Atlas (Users, Products, Documents, Repairs, Notifications, Jobs)
       +----> MongoDB GridFS (Binary File Vault)
       |
       +----> Local n8n Docker Instance (Port 5678)
```

## 2. Network Trust & Address Matrix

| Communication Direction | Origin | Target | Address Used |
|---|---|---|---|
| **Express -> n8n** | Windows Host (Express) | Docker Container (n8n) | `http://localhost:5678` |
| **n8n -> Express** | Docker Container (n8n) | Windows Host (Express) | `http://host.docker.internal:5000` |
| **User -> Express** | Browser / React Frontend | Express API | `http://localhost:5000/api` |

## 3. Authentication & Header Auth Model

Calls originating from n8n targeting the ProofNest backend are secured using **Header Auth**:
- **Header Name:** `X-ProofNest-Webhook-Secret`
- **Header Value:** Configured in `backend/.env` as `N8N_WEBHOOK_SECRET` and in n8n's **Header Auth** credential.
- **Verification:** Verified in Express via [n8nAuthMiddleware.js](file:///c:/Users/parth/Downloads/proofnest/ProofNest/backend/src/middleware/n8nAuthMiddleware.js) using constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

## 4. Endpoints Reference

### Public Health Check
- `GET /api/health`
  - Unauthenticated minimal health endpoint.
  - Returns `{"success": true, "status": "ok", "application": "ProofNest"}`.

### Integration Test Endpoint
- `GET /api/integrations/n8n/test`
  - Protected with `verifyN8nWebhookSecret`.
  - Requires header `X-ProofNest-Webhook-Secret: <N8N_WEBHOOK_SECRET>`.
  - Returns `{"success": true, "message": "n8n authentication successful"}` on success.
  - Returns HTTP 401 when header is missing; HTTP 403 when secret is invalid.

### Document Processing & Callbacks
- `POST /api/integrations/n8n/document-processing` (User JWT authenticated)
  - Creates a `ProcessingJob` record and dispatches an event to n8n's document processing webhook.
  - Sends a short-lived tokenized download URL (`http://host.docker.internal:5000/api/integrations/n8n/documents/:id/download?token=...`).
- `POST /api/integrations/n8n/document-processing/callback` (n8n Header Auth authenticated)
  - Receives extracted fields from n8n and updates `ProcessingJob.result`.
- `GET /api/integrations/n8n/jobs/:jobId` (User JWT authenticated)
  - Allows the React frontend to poll for asynchronous OCR job completion.

### Scheduled Notifications
- `POST /api/integrations/n8n/notifications` (n8n Header Auth authenticated)
  - Invoked by n8n daily cron workflow to evaluate upcoming warranty milestones (`[30, 7, 4, 1, 0]` days).

## 5. Starting the Applications

### Start n8n in Docker
```powershell
docker start proofnest-n8n
```
Verify n8n is running:
```powershell
curl.exe -i http://localhost:5678/healthz
```

### Start ProofNest Backend
From the root directory:
```powershell
npm run dev:backend
```
or directly:
```powershell
node backend/src/server.js
```

### Start ProofNest Frontend
```powershell
npm run dev:frontend
```

## 6. Running Integration Tests
Execute the n8n scenario verification test:
```powershell
node backend/tests/n8nScenario.test.js
```
Execute the complete backend test suite:
```powershell
node backend/tests/runAllTests.js
```
