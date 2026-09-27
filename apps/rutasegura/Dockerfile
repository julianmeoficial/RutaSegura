FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "--filter", "@rutasegura/app", "dev"]

FROM deps AS builder
ENV NODE_ENV=production
RUN pnpm --filter @rutasegura/app build

FROM node:22-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/rutasegura/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/rutasegura/.next/static ./apps/rutasegura/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/rutasegura/public ./apps/rutasegura/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/rutasegura/server.js"]
