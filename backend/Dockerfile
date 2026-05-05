# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install system deps needed by Prisma engines
RUN apk add --no-cache openssl libc6-compat

# Install ALL dependencies (including dev for TypeScript build)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source (node_modules excluded via .dockerignore)
COPY . .

# Generate Prisma client (dummy URL — no DB connection needed for generate)
RUN DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 \
    npx prisma generate

# Build TypeScript → compiles src/** including src/seed.ts → dist/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl openssl libc6-compat

# Install production deps only
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev && npm cache clean --force

# Copy compiled app + Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma CLI binary from builder (devDep — not installed in prod)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Copy prisma schema (needed for db push)
COPY prisma ./prisma

RUN mkdir -p uploads

EXPOSE 3001

# 1. Push schema to DB (creates/updates all tables)
# 2. Seed default hotel + admin if DB is empty
# 3. Start the NestJS server
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

CMD ["sh", "-c", \
  "echo '=== Syncing database schema ===' && \
   ./node_modules/.bin/prisma db push --schema=prisma/schema.prisma --accept-data-loss 2>&1 || echo 'WARNING: db push had issues, continuing...' && \
   echo '=== Seeding initial data ===' && \
   node dist/seed.js 2>&1 || echo 'WARNING: seed had issues, continuing...' && \
   echo '=== Starting server ===' && \
   node dist/main"]
