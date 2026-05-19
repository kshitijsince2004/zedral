FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy the app and shared packages
COPY apps/floor-console/package.json ./apps/floor-console/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source code
COPY apps/floor-console/ ./apps/floor-console/

# Build
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @zedral/floor-console build

# Production
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=base /app/apps/floor-console/.output ./.output

ENV PORT=3001
ENV HOST=0.0.0.0
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]
