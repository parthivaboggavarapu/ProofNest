# ProofNest backend

Node.js + Express backend foundation. The HTTP server, environment validation, security/request middleware, health endpoint, and foundation tests are implemented. Product, document, repair, authentication, and AI APIs remain out of scope for this phase.

## Run locally

1. Copy `.env.example` to `.env` and set `MONGO_URI` to a development MongoDB database.
2. Set `NODE_ENV`, `PORT`, and `FRONTEND_URL`.
3. Run `npm install`.
4. Run `npm run dev` for watch mode or `npm start` for the regular server.
5. Run `npm test` for the isolated foundation tests. These tests do not connect to MongoDB.

The health endpoint is `GET http://localhost:4000/api/health` with the default port.
The existing database integration script requires `NODE_ENV=test` and `MONGO_TEST_URI` pointing to an isolated MongoDB test instance.

Existing model/database details and planned API contracts:

- [`../DATABASE_DOCUMENTATION.md`](../DATABASE_DOCUMENTATION.md)
- [`../docs/07-api-documentation.md`](../docs/07-api-documentation.md)
- [`../docs/09-backend-architecture.md`](../docs/09-backend-architecture.md)

Do not commit local `.env` files or real credentials.
