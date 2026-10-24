# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configurations and package manifests
COPY package*.json pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/
COPY packages/fixtures/package.json ./packages/fixtures/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy full source trees
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY tsconfig.json ./

# Build all packages, server, and web frontend
RUN npm run build --workspaces

# --- Runtime stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Copy package files and install production dependencies only
COPY package*.json pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/
COPY packages/fixtures/package.json ./packages/fixtures/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

RUN npm ci --omit=dev

# Copy built dist directories
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/fixtures/dist ./packages/fixtures/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Expose server port
EXPOSE 3001

# Run Fastify server
CMD ["node", "apps/server/dist/server.js"]
