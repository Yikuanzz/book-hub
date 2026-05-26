# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies
RUN bun install --frozen-lockfile

# ==========================================
# Stage 2: Build Frontend
# ==========================================
FROM oven/bun:1 AS frontend-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY package.json bun.lock ./
COPY frontend ./frontend
COPY backend ./backend

# Build frontend
RUN cd frontend && bun run build

# ==========================================
# Stage 3: Build Backend
# ==========================================
FROM oven/bun:1 AS backend-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY package.json bun.lock ./
COPY backend ./backend

# Compile backend TypeScript
RUN cd backend && bun run build

# ==========================================
# Stage 4: Runner
# ==========================================
FROM oven/bun:slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install runtime dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend compiled output
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy frontend build output
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data and uploads directories
RUN mkdir -p /app/backend/data /app/backend/uploads/books /app/backend/uploads/covers

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the application
WORKDIR /app/backend
CMD ["bun", "dist/index.js"]
