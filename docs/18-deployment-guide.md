# ProofNest — Deployment & Infrastructure Guide

---

## 1. Production Architecture Overview

ProofNest is designed for low operational overhead and reliable scaling using modern PaaS (Platform as a Service) and cloud database infrastructure:

```
[Users / Browsers]
       │
       ▼ (HTTPS / TLS 1.3)
[Cloudflare CDN / Edge Proxy]
       │
       ├─────────────────────────────────┐
       ▼ (Static Assets)                 ▼ (/api/*)
[Frontend: Vercel / Netlify]    [Backend: Render / Railway / Docker]
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      [MongoDB Atlas Replica]   [Encrypted Storage: S3]   [Third-Party APIs]
```

- **Frontend:** Deployed as a static SPA bundle to Vercel or Netlify with global edge CDN caching.
- **Backend:** Deployed as a containerized Node.js service on Render, Railway, or AWS ECS.
- **Database:** Fully managed MongoDB Atlas M10+ replica set with automated point-in-time recovery.
- **Object Storage:** AWS S3 or Cloudflare R2 bucket with server-side encryption (SSE-S3) and private access control lists (ACLs).

---

## 2. Docker Containerization Blueprint

### 2.1 Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder /app ./
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
```

### 2.2 Frontend Dockerfile (For self-hosted Nginx deployment)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Database Provisioning & Atlas Configuration

1. **Cluster Tier:** Minimum M0 (Free Tier for dev/staging), M10+ for production.
2. **Network Access:** IP Access List restricted to backend PaaS outgoing IP addresses or VPC peering.
3. **Automated Backups:** Daily snapshots with 7-day retention.
4. **Database Indexes:** Mongoose automatically ensures indexes on boot in non-production; for production, indexes are applied via migration scripts in `scripts/db-indexes.js`.

---

## 4. Continuous Integration / Continuous Deployment (CI/CD)

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

```yaml
name: ProofNest CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Root & Workspace Dependencies
        run: |
          if [ -f package.json ]; then npm ci; fi

      - name: Secret Leak Prevention Check
        run: |
          if grep -rn "JWT_ACCESS_SECRET=" backend/src/; then
            echo "Error: Hardcoded secrets detected!"
            exit 1
          fi

      - name: Run Backend Unit & Integration Tests
        run: |
          cd backend && if [ -f package.json ]; then npm test; fi

      - name: Run Frontend Lint & Build
        run: |
          cd frontend && if [ -f package.json ]; then npm run build; fi
```

---

## 5. Production Health Checks & Monitoring

- **Liveness Probe:** `GET /health` returns `200 OK { status: "healthy", uptime: 1042 }`.
- **Readiness Probe:** `GET /health/ready` verifies live connectivity to MongoDB and S3 storage before accepting incoming user traffic.
- **Error Tracking:** Sentry integration for unhandled backend exceptions and frontend crash reporting.
