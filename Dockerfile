# Next.js standalone production image for CloudBase 云托管 / any container host.
# Build: docker build -t littlemo-api .
# Run:   docker run -p 3000:3000 --env-file .env.production littlemo-api
# Secrets via env only — never bake .env into the image.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/
# The workspace's postinstall runs prisma generate, which requires the schema.
COPY packages/db/prisma ./packages/db/prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src
COPY packages/db ./packages/db
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate does not need a live DATABASE_URL
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# @prisma/client is serverExternalPackages — copy engines + client into the image
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
