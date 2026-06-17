# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/monitoring/package.json packages/monitoring/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY packages packages
COPY apps/worker apps/worker
RUN pnpm --filter @vhvtv/shared --filter @vhvtv/database --filter @vhvtv/monitoring --filter @vhvtv/worker build
RUN pnpm deploy --filter @vhvtv/worker --prod /prod/worker

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    WORKER_HEALTH_PORT=8081 \
    WORKER_CONCURRENCY=1
WORKDIR /app
RUN apk add --no-cache ffmpeg \
    && addgroup -S vhv \
    && adduser -S -G vhv -u 10001 vhv
COPY --from=build --chown=vhv:vhv /prod/worker ./
USER vhv
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||8081)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
