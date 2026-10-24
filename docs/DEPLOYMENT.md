# LastRack — Production Packaging & Deployment Guide

This document details the production packaging, containerization, and hosting procedures for **LastRack**.

---

## 1. Architecture & Unified Single-Service Serving

In production, LastRack can run as a single unified Node.js process:
- **Fastify Backend (`apps/server`)**: Serves the REST API, handles MCP child process spawning (`@qloo/qloo-harness`), manages rate-limiting, and serves built static frontend assets.
- **Vite React Frontend (`apps/web/dist`)**: Served via `@fastify/static` with Single Page Application (SPA) wildcard fallback, strictly excluding `/api/*` routes.

```
Incoming Request
       │
       ▼
 ┌───────────────┐
 │ Fastify Server│ ◄── [PORT 3001 / 0.0.0.0]
 └───────┬───────┘
         ├─► /api/* ─────────► Fastify REST API & Bounded Controller
         │                           │
         │                           ▼
         │               Qloo MCP Process (`node dist/bin.js mcp`)
         │
         └─► /* ─────────────► Static Files (`apps/web/dist/`)
```

---

## 2. Environment Configuration

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`production`, `development`, `test`) | Yes | `production` |
| `PORT` | HTTP port for Fastify server | No | `3001` |
| `HOST` | Bind address | No | `0.0.0.0` |
| `QLOO_API_KEY` | Official Qloo API key for live intelligence queries | Optional (Starts in `DEMO_FIXTURE` if omitted) | None |
| `CLIENT_ORIGIN`| Allowed CORS origin for dedicated split deployments | No | `http://localhost:5173` |

---

## 3. Containerization (Dockerfile & Health Check)

LastRack includes a multi-stage production Dockerfile located at `Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "apps/server/dist/server.js"]
```

### Truthful Docker Verification Status
- **Host System Status:** `NOT_VERIFIED (Docker CLI is not installed in the local Windows environment)`
- **Configuration Status:** Verified correct configuration without nonexistent root `tsconfig.json` references and with proper HTTP health check probing `/api/health`.

---

## 4. Bare Metal / VM Deployment (Ubuntu / Debian / Alpine)

To run LastRack directly on any long-running server capable of child-process spawning:

```bash
# 1. Clone repository
git clone https://github.com/abhijeetnardele24-hash/lastrack.git
cd lastrack

# 2. Install dependencies & build all packages
npm ci
npm run build

# 3. Configure production environment
cat << 'EOF' > .env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
QLOO_API_KEY=your_live_qloo_key_here
EOF

# 4. Start production server
node apps/server/dist/server.js
```

---

## 5. Verification Commands

Once running, verify deployment health and readiness:

```bash
# Check server health and MCP initialization status
curl -s http://127.0.0.1:3001/api/health

# Output should show:
# {"status":"ok","uptimeSeconds":...,"sourceMode":"...","mcpReady":true,"contractChecksum":"sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5"}
```
