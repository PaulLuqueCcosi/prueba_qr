# syntax=docker/dockerfile:1

# ---- build -------------------------------------------------------------------
# Same minor as go.mod (1.27.x); alpine keeps the builder small.
FROM golang:1.27-alpine AS build
WORKDIR /src

# Manifests first: the module download layer is reused until go.mod/go.sum change.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
# Static binaries (no libc needed in the final image), smaller with -trimpath and stripped symbols.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

# ---- runtime -----------------------------------------------------------------
# Distroless: no shell or package manager, runs as a non-root user by default.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /out/healthcheck /

# Numeric user (distroless "nonroot") so orchestrators can verify it is not root.
USER 65532:65532

# Configuration comes from the environment (see .env.example); PORT is the only default.
ENV PORT=8080
EXPOSE 8080

# No curl/wget in distroless: the probe is a small Go binary built above.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["/healthcheck"]

# Exec form: the Go process is PID 1 and receives SIGTERM directly (graceful shutdown).
ENTRYPOINT ["/server"]
