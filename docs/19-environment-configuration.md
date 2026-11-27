# ProofNest — Environment Configuration Blueprint

---

## 1. Environment Variable Architecture & Safety

To protect user confidentiality and prevent unauthorized access, ProofNest enforces strict environment boundaries:
- **Zero Secrets Committed:** Real API keys, session secrets, and database connection strings are never committed to Git.
- **Example Templates:** `.env.example`, `backend/.env.example`, and `frontend/.env.example` contain placeholder values only.
- **Frontend Isolation:** The frontend Vite application only receives variables prefixed with `VITE_`. Backend secrets (session secret, storage credentials, LLM keys) are completely unreachable by browser code.

---

## 2. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Example | Secret? | Purpose |
| :--- | :---: | :--- | :---: | :--- |
| `NODE_ENV` | Yes | `development` | No | Operational environment (`development`, `test`, `production`). |
| `PORT` | Yes | `4000` | No | Port on which the Express HTTP server listens. |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | No | Allowed CORS origin for credentials and cookies. |
| `TRUST_PROXY` | No | `0` | No | Number of trusted reverse-proxy hops (integer `0`–`10`); keep `0` unless a fixed proxy chain is configured. |
| `MONGO_URI` | Yes | `mongodb://127.0.0.1:27017/proofnest` | **Yes** | MongoDB connection string including credentials. |
| `SESSION_SECRET` | Yes | Unique random value, at least 32 characters | **Yes** | Signs MongoDB-backed server-side session cookies. |
| `STORAGE_PROVIDER` | Yes | `local` | No | File storage adapter (`local` or `s3_compatible`). |
| `STORAGE_LOCAL_DIR` | If local | `./uploads` | No | Directory path for local file storage in development. |
| `STORAGE_BUCKET` | If s3 | `proofnest-documents` | No | S3 / Cloudflare R2 bucket name. |
| `STORAGE_REGION` | If s3 | `us-east-1` | No | Cloud storage region. |
| `STORAGE_ACCESS_KEY` | If s3 | `AKIAIOSFODNN7EXAMPLE` | **Yes** | Object storage access key ID. |
| `STORAGE_SECRET_KEY` | If s3 | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | **Yes** | Object storage secret key. |
| `MAX_UPLOAD_BYTES` | No | `10485760` (10 MB) | No | Maximum allowed file upload size in bytes. |
| `ALLOWED_UPLOAD_MIME` | No | `application/pdf,image/jpeg,image/png,image/webp` | No | Comma-separated allowed MIME types. |
| `OCR_PROVIDER` | Yes | `none` (or `tesseract`, `document_ai`) | No | OCR engine adapter selection. |
| `OCR_API_KEY` | If cloud | `AIzaSy...` | **Yes** | API key for cloud OCR services. |
| `LLM_PROVIDER` | Yes | `none` (or `openai_compatible`, `anthropic`) | No | LLM engine adapter selection. |
| `LLM_API_KEY` | If cloud | `sk-...` | **Yes** | API key for LLM queries. |
| `LLM_MODEL` | If cloud | `gpt-4o-mini` | No | Designated LLM model identifier. |
| `REMINDER_JOB_ENABLED`| No | `true` | No | Enables or disables background reminder worker. |
| `REMINDER_JOB_CRON` | No | `0 * * * *` (Hourly) | No | Cron expression for reminder evaluation. |

---

## 3. Frontend Environment Variables (`frontend/.env`)

All frontend variables must be prefixed with `VITE_` to be recognized by Vite:

| Variable Name | Required | Default / Example | Secret? | Purpose |
| :--- | :---: | :--- | :---: | :--- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:4000` | No | Target URL for backend REST API calls. |
| `VITE_APP_NAME` | No | `ProofNest` | No | Display name used in page titles and navigation header. |

---

## 4. Setup Instructions for Developers

1. **Backend Setup:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env`, ensure `MONGO_URI` points to your development MongoDB instance, and replace `SESSION_SECRET` with a unique random value of at least 32 characters. Never reuse the example value.

2. **Frontend Setup:**
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Confirm that `VITE_API_BASE_URL` matches the backend port (default: `http://localhost:4000`).

3. **Validation on Boot:**
   The backend `config/env.js` module validates `NODE_ENV`, `PORT`, `MONGO_URI`, `FRONTEND_URL`, and `SESSION_SECRET` at server startup. If any is missing or malformed, startup stops with an error that identifies the invalid variable without printing its value.

The database connection module also accepts `MONGODB_URI` as a compatibility fallback, but the backend foundation uses `MONGO_URI` as the required canonical name.

Authentication uses HTTP-only, `SameSite=Lax` cookies with `Secure` enabled in production. When TLS terminates at a reverse proxy, configure Express to trust only the known proxy hop(s). Cross-origin frontend requests must use `credentials: "include"` with `fetch` or `withCredentials: true` with Axios.

State-changing API requests require an `Origin` matching `FRONTEND_URL`. An originless request is permitted only for a non-browser `application/json` client with no Fetch Metadata headers and no ProofNest session cookie; CORS alone is not CSRF protection.

