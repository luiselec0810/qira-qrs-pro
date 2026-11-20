# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma ./packages/db/prisma
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma && npm run build -w @qira/api

FROM base AS runner
ENV NODE_ENV=production
ENV API_PORT=4000

COPY --from=builder /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api ./apps/api

RUN mkdir -p /app/apps/api/uploads

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate && (npx tsx packages/db/prisma/seed.ts || true) && npx tsx apps/api/src/server.ts"]
