# syntax=docker/dockerfile:1

# LTS line, pinned to the major; the package.json engines field requires >=22.
ARG NODE_VERSION=24

# ---- production dependencies ---------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` installs exactly what the lockfile says; --omit=dev leaves out build/test tooling.
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- build ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime --------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8081
WORKDIR /app

# Only what runs: production modules, compiled code and the OpenAPI spec served at /docs.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node openapi ./openapi

USER node
EXPOSE 8081

# busybox wget ships with alpine, so no extra packages are needed.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

# Run node directly (not `npm start`) so it is the process that receives SIGTERM.
CMD ["node", "dist/main/server.js"]
