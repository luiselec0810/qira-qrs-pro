# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
ARG BASE_URL=https://qira.alkonpos.com
ARG API_URL=http://api:4000
ENV BASE_URL=${BASE_URL}
ENV NEXT_PUBLIC_BASE_URL=${BASE_URL}
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma ./packages/db/prisma
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build -w @qira/web

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@qira/web"]
