# ProofNest backend

Node.js + Express backend. The HTTP server, environment validation, security/request middleware, health endpoint, MongoDB-backed session authentication, and isolated foundation/authentication tests are implemented. Product, document, repair, and AI APIs remain out of scope.

## Run locally

1. Copy `.env.example` to `.env` and set `MONGO_URI` to a development MongoDB database.
2. Set `NODE_ENV`, `PORT`, `FRONTEND_URL`, and a unique `SESSION_SECRET` of at least 32 characters. `TRUST_PROXY` defaults to `0`.
3. Run `npm install`.
4. Run `npm run dev` for watch mode or `npm start` for the regular server.
5. Run `npm test` for the isolated foundation tests. These tests do not connect to MongoDB.

The health endpoint is `GET http://localhost:4000/api/health` with the default port.
The database integration script requires `NODE_ENV=test` and `MONGO_TEST_URI` pointing to a separately provisioned test MongoDB deployment.

## Authentication

Authentication uses server-side sessions stored in MongoDB through the existing `connect-mongo` session-store factory. Session cookies are HTTP-only, `SameSite=Lax`, seven days in duration, and `Secure` in production. Configure the application behind HTTPS in production; when TLS terminates at a reverse proxy, configure Express to trust only the actual proxy hop(s).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user; the role is always `user`. |
| `POST` | `/api/auth/login` | Verify credentials and regenerate the session. |
| `POST` | `/api/auth/logout` | Destroy the server-side session and clear its cookie. |
| `GET` | `/api/auth/me` | Return the authenticated user's safe profile. |

The frontend must send cookies on cross-origin requests: use `fetch(..., { credentials: "include" })` or Axios `{ withCredentials: true }`. The API allows credentials only from the configured `FRONTEND_URL`. Browser clients must use HTTPS in production for secure cookies.

Login and registration have per-process rate limits. Deployments with multiple backend instances should configure a shared rate-limit store at the infrastructure layer.

State-changing requests (`POST`, `PUT`, `PATCH`, and `DELETE`) must have an `Origin` matching `FRONTEND_URL`. Originless requests are accepted only for non-browser clients sending `application/json`, without Fetch Metadata headers or the session cookie; browser requests without a trusted `Origin` are rejected. CORS controls browser response access but is not itself CSRF protection.

`TRUST_PROXY` accepts only an integer hop count from `0` to `10`; its safe default is `0`. Set it to the exact, fixed number of trusted reverse-proxy hops only when those proxies overwrite forwarded headers. Never set it to `true`. If TLS terminates at a proxy, configure this value so Express can correctly identify HTTPS and emit `Secure` cookies.

Existing model/database details and planned API contracts:

- [`../DATABASE_DOCUMENTATION.md`](../DATABASE_DOCUMENTATION.md)
- [`../docs/07-api-documentation.md`](../docs/07-api-documentation.md)
- [`../docs/09-backend-architecture.md`](../docs/09-backend-architecture.md)

Do not commit local `.env` files or real credentials.
