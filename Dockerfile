# ── Stage 1: install production dependencies ────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first — Docker caches this layer
# If package.json hasn't changed, npm ci is skipped on rebuild
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ───────────────────────────────────────────────
FROM node:20-alpine AS production

# Create a non-root user — running as root inside a container is a security risk
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production node_modules from Stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY server.js ./
COPY app.js ./
COPY data/ ./data/

# Switch to non-root user
USER appuser

# Document the port this app listens on
EXPOSE 5000

# Health check — Docker itself will ping this endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
