# ProofNest — Full-Stack Prototype (JWT Architecture)

> **"One Product. One Place. Complete History."**  
> *Every Purchase, Safely Organized.*

ProofNest is a production-grade product lifecycle management platform that consolidates purchased goods, invoices, receipts, warranty terms, maintenance logs, and repair expenses in one secure location. It features smart invoice OCR extraction, automated deadline reminder notifications, and an AI assistant with retrieval-augmented generation (RAG) grounded in the user's private documents.

---

## Key Features

1. **Secure JWT Authentication & Multi-Tenancy**
   - Pure JWT architecture (no server-side sessions, no `connect-mongo`, no Supabase).
   - Short-lived Access Tokens (15 minutes) kept exclusively in client memory.
   - Long-lived cryptographically secure Refresh Tokens stored in `HttpOnly`, `SameSite=Strict` cookies.
   - Refresh token rotation on every call with token family reuse detection (revokes entire compromised family upon attempted reuse).
   - Strict tenant scoping across all models and endpoints.

2. **Purchased Products Portfolio**
   - Full CRUD management of items (brand, model, serial number, purchase price, date, category).
   - Partial unique compound indexing to prevent duplicate serial numbers per user.
   - Live warranty countdown badges with status filters (Active, Expiring in 30 days, Expired).

3. **Cloud Document Vault (MongoDB GridFS)**
   - Binary file storage using MongoDB GridFS bucket (`documentsBucket`) supporting invoices, receipts, warranty cards, manuals, and repair bills up to 10MB.
   - Security verification via MIME type and magic-byte header validation (PDF, PNG, JPEG, WebP).
   - In-browser streaming (`/api/documents/:id/stream`) and attachment download (`/api/documents/:id/download`).

4. **Invoice OCR & Heuristic Data Extraction**
   - In-memory OCR parsing using `tesseract.js` for images and `pdf-parse` for vector PDF receipts.
   - Heuristic extraction for brand, seller/retailer, purchase price, invoice number, purchase date, and warranty terms.
   - Review-and-confirm workflow (`POST /api/ocr/confirm`) to allow user verification before creating product records.

5. **Maintenance & Repair History**
   - Service logging with defect descriptions, status workflows (`requested`, `approved`, `in_progress`, `completed`, `rejected`), costs, and service centers.
   - Aggregation analytics calculating total repair expenditures per product and across user portfolios.

6. **Smart Deadline Reminders (node-cron)**
   - Automated daily cron scheduler checking milestone intervals at `[30, 7, 4, 1, 0]` days before warranty expiration.
   - In-app notification center with read-state tracking, batch read actions, and on-demand manual check trigger (`POST /api/notifications/trigger-check`).

7. **Grounded AI Assistant (OpenRouter RAG + Atlas Search)**
   - Chunks stored documents into semantic segments (`DocumentChunk` model).
   - Hybrid retrieval querying both structured metadata and document text.
   - LLM integration via OpenRouter API with conversational memory and strict citation grounding.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons
- **Backend**: Node.js, Express.js REST API
- **Database**: MongoDB Atlas (`ProofNestCluster`, database `proofnest`), Mongoose ODM
- **File Storage**: MongoDB GridFS
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`
- **Background Jobs**: `node-cron`
- **OCR Engine**: `pdf-parse`, `tesseract.js`
- **AI & LLM**: OpenRouter API with hybrid fallback retriever

---

## Repository Structure

```text
ProofNest/
├── backend/
│   ├── src/
│   │   ├── config/             # DB connection with replica-set fallback, GridFS bucket
│   │   ├── constants/          # Status enums, notification milestone intervals
│   │   ├── controllers/        # Express route controllers
│   │   ├── middleware/         # Auth, RateLimiter, ErrorHandler, Multer upload
│   │   ├── models/             # Mongoose schemas (User, RefreshToken, Product, Document, etc.)
│   │   ├── routes/             # REST route declarations
│   │   ├── services/           # Business logic, OCR, GridFS, RAG, Reminders
│   │   ├── utils/              # Token signing, hashing, cookie helpers
│   │   ├── jobs/               # node-cron scheduled tasks
│   │   ├── app.js              # Express app initialization
│   │   └── server.js           # Server listen & lifecycle handling
│   ├── tests/                  # Integration test suite (runAllTests.js)
│   ├── .env.example            # Backend environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout (Navbar, Sidebar), Guards (ProtectedRoute, PublicRoute)
│   │   ├── context/            # AuthContext (silent refresh), ToastContext
│   │   ├── layouts/            # MainLayout
│   │   ├── pages/              # 12 complete responsive views
│   │   ├── services/           # Axios instance with 401 interceptor
│   │   ├── App.jsx             # React Router routing table
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Tailwind CSS directives
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/                       # Blueprints & architectural design specs
└── package.json                # Monorepo root scripts
```

---

## Getting Started

### Prerequisites

- Node.js (v18+ or v20+)
- npm or yarn
- MongoDB Atlas cluster URI or local MongoDB instance

### 1. Environment Setup

Copy `.env.example` in `backend/` and configure your environment:

```bash
cd backend
cp .env.example .env
```

Ensure `backend/.env` has the following variables configured:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/proofnest?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

In `frontend/`:
```bash
cd ../frontend
cp .env.example .env
```
Ensure `VITE_API_URL=http://localhost:5000/api` is present in `frontend/.env`.

---

## Running the Application

From the root directory:

```bash
# Install dependencies
npm --prefix backend install
npm --prefix frontend install

# Start Backend Dev Server (Port 5000)
npm run dev:backend

# Start Frontend Dev Server (Port 5173)
npm run dev:frontend
```

Open your browser at `http://localhost:5173`.

---

## Running the Test Suite

The automated test suite verifies all 8 sub-systems (Database connection, JWT auth & token rotation, Multi-tenancy isolation, GridFS streaming, OCR parsing heuristics, Repair tracking & analytics, Milestone reminders, and AI RAG):

```bash
npm run test:backend
# or: node backend/tests/runAllTests.js
```

All 23 integration tests will run and automatically clean up temporary test records.

---

## API Endpoints Reference

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login and receive access token + HttpOnly cookie | No |
| POST | `/api/auth/refresh` | Rotate refresh token and issue new access token | Cookie |
| POST | `/api/auth/logout` | Invalidate current refresh token | Yes |
| POST | `/api/auth/logout-all` | Revoke all refresh tokens across devices | Yes |
| GET | `/api/auth/me` | Fetch authenticated user profile | Yes |
| GET | `/api/products` | List all user products | Yes |
| POST | `/api/products` | Create new product | Yes |
| GET | `/api/products/:id` | Get single product details | Yes |
| PUT | `/api/products/:id` | Update product | Yes |
| DELETE | `/api/products/:id` | Delete product | Yes |
| POST | `/api/documents/upload` | Upload file to GridFS vault | Yes |
| GET | `/api/documents` | List stored documents | Yes |
| GET | `/api/documents/:id/stream` | Stream document for preview | Yes |
| GET | `/api/documents/:id/download` | Download file attachment | Yes |
| DELETE | `/api/documents/:id` | Delete document from GridFS | Yes |
| POST | `/api/ocr/extract` | Extract invoice fields using OCR | Yes |
| POST | `/api/ocr/confirm` | Confirm parsed data & create product | Yes |
| GET | `/api/repairs` | List repair logs & cost analytics | Yes |
| POST | `/api/repairs` | Log repair or service record | Yes |
| DELETE | `/api/repairs/:id` | Delete repair record | Yes |
| GET | `/api/notifications` | Get deadline notifications | Yes |
| PATCH | `/api/notifications/:id/read`| Mark single notification as read | Yes |
| PATCH | `/api/notifications/read-all`| Mark all notifications as read | Yes |
| POST | `/api/notifications/trigger-check`| Run manual deadline check | Yes |
| POST | `/api/ai/query` | Ask grounded AI question with RAG | Yes |
| GET | `/api/ai/conversations` | List user conversation threads | Yes |
| GET | `/api/ai/conversations/:id/messages`| Get chat history | Yes |
| DELETE| `/api/ai/conversations/:id` | Delete conversation thread | Yes |

---

## Security & Architectural Notes

- **Access Token Life:** 15 minutes. Stored strictly in memory in `src/services/api.js`.
- **Refresh Token Rotation:** On every refresh call, the old token is removed from MongoDB and a new cryptographically random token is generated.
- **Reuse Detection:** Every token family is tracked. If an old, already-rotated token is reused, all tokens belonging to that user's family are immediately revoked (HTTP 403 Forbidden).
- **Password Protection:** Plain-text passwords never touch database records; hashed via `bcryptjs` (cost factor 10) and omitted from queries by default (`select: false`).
- **Data Isolation:** All data access is filtered strictly by `req.user.id`.
