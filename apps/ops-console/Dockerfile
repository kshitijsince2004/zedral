FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the app and shared packages
COPY apps/ops-console/package.json ./apps/ops-console/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source code
COPY apps/ops-console/ ./apps/ops-console/

# Build
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=
ARG VITE_KEYCLOAK_URL=
ARG VITE_KEYCLOAK_REALM=
ARG VITE_KEYCLOAK_CLIENT_ID=
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN pnpm --filter @zedral/ops-console build

# Production
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=base /app/apps/ops-console/.output ./.output

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
