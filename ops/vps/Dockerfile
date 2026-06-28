# syntax=docker/dockerfile:1

# ScholarshipTop site only — matches Railway RAILPACK (Node 22, next start).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY lib/shims/server-only-npm ./lib/shims/server-only-npm
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=768"
ENV NEXT_TELEMETRY_DISABLED=1
ENV GENERATE_SOURCEMAP=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public env via .env.production in app context (NEXT_PUBLIC_*).
ARG BUILDKIT_INLINE_CACHE=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/.next ./.next
# Runtime SEO bundles (read via fs at request time — not bundled into .next)
COPY --chown=nextjs:nodejs --from=builder /app/data/long-tail-seo ./data/long-tail-seo
COPY --chown=nextjs:nodejs --from=builder /app/data/seo-scholarship-content ./data/seo-scholarship-content
COPY --chown=nextjs:nodejs --from=builder /app/data/seo-pending-queue.json ./data/seo-pending-queue.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
