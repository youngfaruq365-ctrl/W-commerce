# W-COMMERCE — Multi-stage Dockerfile
# Stage 1: Build the Vite frontend
# Stage 2: Production Node.js server (no dev deps, no source maps)

# ── Stage 1: Frontend Build ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Copy root package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy frontend source
COPY frontend/ ./frontend/
COPY tsconfig*.json ./

# Build frontend assets
RUN npm run build:production


# ── Stage 2: Production Server ───────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy backend source
COPY backend/ ./backend/
COPY database/ ./database/
COPY scripts/ ./scripts/

# Copy compiled frontend from builder stage
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Run Prisma generate (needs schema)
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Migrate DB schema then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=database/prisma/schema.prisma && node backend/server.cjs"]
