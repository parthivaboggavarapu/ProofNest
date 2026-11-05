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
|    identity is strictly extracted from cryptographically verified JWT tokens.           |
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

### 2.1 JWT Cookie Architecture
ProofNest rejects storing JWT tokens in HTML5 `localStorage` or `sessionStorage` due to vulnerability to Cross-Site Scripting (XSS) attacks.

Instead, authentication utilizes a dual-token strategy delivered via **`httpOnly` cookies**:
- **Access Token:**
  - Lifespan: 15 minutes.
  - Payload: `{ id: user._id, email: user.email }`.
  - Cookie attributes: `HttpOnly; Secure; SameSite=Lax; Path=/api`.
- **Refresh Token:**
  - Lifespan: 7 days.
  - Stored in hashed format in the database or verified via separate secret.
  - Cookie attributes: `HttpOnly; Secure; SameSite=Lax; Path=/api/auth/refresh`.

### 2.2 Password Security
- Passwords must be a minimum of 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
- Hashing is performed using **bcrypt** with a minimum work factor (salt rounds) of **12**.
- Password hashes are excluded by default in Mongoose queries (`select: false`).

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
Cross-Origin Resource Sharing is strictly locked to the designated frontend origin:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

### 5.3 Rate Limiting
Configured using `express-rate-limit`:
- **Auth Routes (`/api/auth/*`):** Maximum 5 attempts per 15 minutes per IP (mitigates brute-force credential stuffing).
- **AI Assistant Routes (`/api/assistant/*`):** Maximum 20 requests per 10 minutes per user (mitigates LLM cost spikes and denial of wallet).
- **General API Routes (`/api/*`):** Maximum 100 requests per minute per IP.

---

## 6. Input Validation & Sanitization

All incoming request bodies are validated using strict schema validators (e.g. `express-validator`):
- String lengths are capped (product names <= 120 chars, descriptions <= 1000 chars).
- Dates are checked for valid ISO-8601 formatting and logical consistency (e.g. `warrantyExpiryDate >= purchaseDate`).
- Numbers are constrained (purchase price >= 0, repair cost >= 0).
- Special characters in user-supplied strings are sanitized to prevent NoSQL query injection and stored XSS.
