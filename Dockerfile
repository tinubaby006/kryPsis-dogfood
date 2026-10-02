FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client and download schema engine during build
RUN npx prisma generate && npx prisma validate

# Build Next.js application
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV BETTER_AUTH_SECRET="dummy_secret_for_build_only"
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install tsx globally or locally for seeding? We have it in node_modules from builder.
# We copy node_modules entirely to ensure Prisma and tsx work seamlessly for scripts/seed.ts
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy source files needed for runtime/seeding
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/docs ./docs
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=node:node /app/tsconfig.scripts.json ./tsconfig.scripts.json
COPY --from=builder --chown=node:node /app/prisma7.config.ts ./prisma7.config.ts

# Ensure uploads and assessment directories exist
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads && \
    mkdir -p /app/assessment && chown -R node:node /app/assessment && \
    touch /app/.env && chown node:node /app/.env

# Create a startup script with assessment wrapper
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'if [ -z "$DATABASE_URL" ]; then echo "FATAL: DATABASE_URL is missing"; exit 1; fi' >> /app/start.sh && \
    echo 'if [ -z "$BETTER_AUTH_SECRET" ]; then echo "FATAL: BETTER_AUTH_SECRET is missing"; exit 1; fi' >> /app/start.sh && \
    echo 'echo "Running migrate..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Running seed..."' >> /app/start.sh && \
    echo 'npm run db:seed' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'if [ "$ASSESSMENT_MODE" = "1" ]; then' >> /app/start.sh && \
    echo '    echo "Starting Next.js in background for assessment..."' >> /app/start.sh && \
    echo '    npm start &' >> /app/start.sh && \
    echo '    NEXT_PID=$!' >> /app/start.sh && \
    echo '    trap "kill -TERM $NEXT_PID; wait $NEXT_PID" TERM INT' >> /app/start.sh && \
    echo '    echo "Waiting for Next.js to start..."' >> /app/start.sh && \
    echo '    TIMEOUT=30' >> /app/start.sh && \
    echo '    while [ $TIMEOUT -gt 0 ]; do' >> /app/start.sh && \
    echo '        if curl -s -f http://127.0.0.1:3000/ > /dev/null; then break; fi' >> /app/start.sh && \
    echo '        sleep 1' >> /app/start.sh && \
    echo '        TIMEOUT=$((TIMEOUT-1))' >> /app/start.sh && \
    echo '    done' >> /app/start.sh && \
    echo '    if [ $TIMEOUT -eq 0 ]; then echo "FATAL: Timeout waiting for Next.js"; kill $NEXT_PID; exit 1; fi' >> /app/start.sh && \
    echo '    echo "Running real-login generator..."' >> /app/start.sh && \
    echo '    npx tsx scripts/generate-assessment-config.ts' >> /app/start.sh && \
    echo '    echo "Assessment config generated successfully."' >> /app/start.sh && \
    echo '    wait $NEXT_PID' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '    exec npm start' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    chmod +x /app/start.sh

USER node

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["/app/start.sh"]
