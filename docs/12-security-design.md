# ProofNest — Security Architecture & Validation Blueprint

---

## 1. Threat Model & Security Principles

ProofNest stores personal financial data, purchase receipts, home addresses, device serial numbers, and private documents. Security is not an afterthought; it is designed into every layer of the architecture.

```
+-----------------------------------------------------------------------------------------+
|                              CORE SECURITY PRINCIPLES                                   |
+-----------------------------------------------------------------------------------------+
| 1. ZERO TRUST TENANT ISOLATION:                                                         |
|    No API endpoint or database query ever trusts user input for ownership. The caller's |
|    identity is loaded from the user referenced by a verified server-side session.        |
|                                                                                         |
| 2. ZERO CREDENTIALS IN CODE OR REPO:                                                    |
|    API keys, database strings, and secrets must never be committed. All configuration   |
|    is loaded from environment variables and validated at runtime.                       |
|                                                                                         |
| 3. DEFENSE IN DEPTH:                                                                    |
|    Security is enforced across multiple tiers: TLS, HTTP headers, CORS, rate limiting,  |
|    MIME validation, input sanitization, and Mongoose schema constraints.                |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Authentication & Session Management

### 2.1 MongoDB-Backed Session Architecture
Authentication uses `express-session` and the existing `connect-mongo` session-store factory. The application starts MongoDB before creating the session store, which reuses the active Mongoose MongoClient. Production sessions are not stored in `MemoryStore`.

- Successful login regenerates the session before storing the user's ID, preventing session fixation.
- The server stores only the session record and user ID; authenticated requests reload the user from MongoDB so role changes are not trusted from stale cookie data.
- Logout destroys the server-side session and clears the browser cookie.
- `GET /api/auth/me` returns only the user's safe `id`, `name`, `email`, and `role`.
- Session persistence is seven days. `SESSION_SECRET` is required and must be at least 32 characters; there is no code fallback.
- The `proofnest.sid` cookie is `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production. HTTPS is required in production. If TLS terminates at a reverse proxy, configure `TRUST_PROXY` to the exact fixed number of trusted hops; the default is `0`, and `true` is not accepted.

### 2.2 CSRF & Origin Validation
Every state-changing request (`POST`, `PUT`, `PATCH`, and `DELETE`) is checked against the configured `FRONTEND_URL` before session processing:

- Requests with an `Origin` are accepted only when it is a valid HTTP(S) origin matching the configured frontend origin.
- `Origin: null`, malformed origins, and untrusted origins receive HTTP 403.
- Originless clients are allowed only when they send `application/json`, no ProofNest session cookie, and no Fetch Metadata headers (`Sec-Fetch-Site`, `Sec-Fetch-Mode`, or `Sec-Fetch-Dest`). This is intended for non-browser API clients. Originless browser form, authenticated, or Fetch Metadata requests are rejected.
- CORS and CSRF checks use the same trusted-origin policy. CORS controls browser access to responses; it does not by itself prevent CSRF.
- `SameSite=Lax` reduces cross-site cookie sending but does not replace the Origin check.

### 2.3 Password Security
- The current API requires at least 6 characters and caps password input at bcrypt's 72 UTF-8 byte limit.
- Hashing uses the existing User model's `bcryptjs` pre-save hook.
- Password hashes are excluded by default in Mongoose queries (`select: false`).
- The existing model currently uses 10 bcrypt rounds; this does not meet the 12-round target in FR-SEC-01 and remains a separate security follow-up.

---

## 3. Strict Tenant Isolation (Ownership Verification)

### 3.1 The Invariant Rule
Every database operation involving products, documents, deadlines, repairs, notifications, or AI conversations **MUST enforce `userId === req.user.id`**.

```javascript
// SECURE PATTERN: Tenant isolation enforced directly in query
const product = await Product.findOne({ _id: productId, userId: req.user.id });
if (!product) {
  throw new AppError('Product not found or access denied', 404, 'NOT_FOUND');
}

// INSECURE PATTERN (STRICTLY PROHIBITED):
const product = await Product.findById(productId); // Vulnerable to IDOR!
```

### 3.2 Insecure Direct Object Reference (IDOR) Defense
Even if an attacker guesses or enumerates a valid MongoDB `ObjectId` belonging to another user, ProofNest returns `404 Not Found`. Returning `404` instead of `403 Forbidden` prevents attackers from confirming whether a resource ID exists in the system.

---

## 4. File Upload & Storage Security

### 4.1 Four-Stage Upload Hardening Pipeline
```
[Uploaded File Stream]
         │
         ▼
[1. File Size Verification (Multer)]: Rejects files > 10 MB with HTTP 413
         │
         ▼
[2. Extension Whitelist]: Enforces .pdf, .jpg, .jpeg, .png, .webp
         │
         ▼
[3. Magic Byte Inspection (file-type)]: Inspects initial binary buffer
    - Rejects executable files renamed to .pdf
         │
         ▼
[4. Unguessable UUID Storage]: 
    - File renamed to <uuidv4>.<ext>
    - Stored in non-public directory / private bucket
```

### 4.2 Authorized File Download & Streaming
Uploaded documents are **NEVER exposed via public static web directories**.

To download or view a file:
1. Client requests `GET /api/documents/:id/download`.
2. Auth middleware verifies the session cookie.
3. Controller queries `Document.findOne({ _id: id, userId: req.user.id })`.
4. If authorized, the backend streams the file using chunked transfer encoding with strict security headers:
   ```http
   Content-Disposition: attachment; filename="sanitized_original_name.pdf"
   Content-Type: application/pdf
   X-Content-Type-Options: nosniff
   ```

---

## 5. Network & Edge Hardening

### 5.1 Helmet & Security Headers
Express uses `helmet()` to configure defensive headers:
- `Content-Security-Policy`: Restricts scripts, objects, and framing sources.
- `X-Frame-Options: DENY`: Prevents clickjacking attacks.
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `Strict-Transport-Security`: Enforces HTTPS for 1 year (`max-age=31536000; includeSubDomains`).

### 5.2 CORS Policy
Cross-Origin Resource Sharing allows credentials only from the designated frontend origin. The same origin is enforced for state-changing requests by the CSRF Origin middleware:
```javascript
const corsOptions = {
  origin: configuredFrontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
```

Requests without `Origin` are accepted for state-changing operations only under the documented non-browser JSON policy, and never when a ProofNest session cookie is present. CORS alone is not CSRF protection.

### 5.3 Rate Limiting
Configured using `express-rate-limit`:
- **Registration:** Maximum 5 attempts per 15 minutes per IP.
- **Login:** Maximum 10 attempts per 15 minutes per IP.
- The current implementation uses the limiter's per-process store. Multi-instance deployments should configure a shared rate-limit store.
- AI and general API rate limits remain future work.

---

## 6. Input Validation & Sanitization

All incoming request bodies are validated using strict schema validators (e.g. `express-validator`):
- String lengths are capped (product names <= 120 chars, descriptions <= 1000 chars).
- Dates are checked for valid ISO-8601 formatting and logical consistency (e.g. `warrantyExpiryDate >= purchaseDate`).
- Numbers are constrained (purchase price >= 0, repair cost >= 0).
- Special characters in user-supplied strings are sanitized to prevent NoSQL query injection and stored XSS.

