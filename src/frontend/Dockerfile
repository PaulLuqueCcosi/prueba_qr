# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- build ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Vite inlines VITE_* values into the bundle at build time, so changing them needs a rebuild.
# They are public (the SPA is a public OIDC client): never pass secrets here.
ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ARG VITE_GO_API_URL
ARG VITE_NODE_API_URL
ENV VITE_LOGTO_ENDPOINT=$VITE_LOGTO_ENDPOINT \
    VITE_LOGTO_APP_ID=$VITE_LOGTO_APP_ID \
    VITE_GO_API_URL=$VITE_GO_API_URL \
    VITE_NODE_API_URL=$VITE_NODE_API_URL

# Fail early with a clear message instead of shipping a bundle that shows the config-error screen.
RUN test -n "$VITE_LOGTO_ENDPOINT" || { echo "build-arg VITE_LOGTO_ENDPOINT is required (see .env.example)"; exit 1; }
RUN test -n "$VITE_LOGTO_APP_ID" || { echo "build-arg VITE_LOGTO_APP_ID is required (see .env.example)"; exit 1; }
RUN npm run build

# Fill the CSP template with the same origins the bundle was built with
# (the API URLs fall back to the defaults the app itself uses when unset).
RUN mkdir /out \
 && GO="${VITE_GO_API_URL:-http://localhost:8080}" \
 && NODE="${VITE_NODE_API_URL:-http://localhost:8081}" \
 && sed -e "s|__LOGTO_ENDPOINT__|${VITE_LOGTO_ENDPOINT%/}|g" \
        -e "s|__GO_API_URL__|${GO%/}|g" \
        -e "s|__NODE_API_URL__|${NODE%/}|g" \
        security-headers.conf.template > /out/security-headers.conf \
 && cp nginx.conf.template /out/default.conf

# ---- runtime --------------------------------------------------------------------
# nginx-unprivileged: runs as a non-root user and listens on 8080; pid and temp files live in /tmp,
# so the container works with a read-only root filesystem plus a tmpfs on /tmp.
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY --from=build /out/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
# The base image already runs `nginx -g "daemon off;"` in exec form as the unprivileged user.
