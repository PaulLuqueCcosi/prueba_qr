# Monorepo task runner (works from Git Bash on Windows, Linux and macOS).
#
# Configuration lives in each service's own `.env` (copy it from `.env.example`):
#   src/go-api/.env    src/node-api/.env    src/frontend/.env.local
# The services read plain environment variables; the run-* targets only load that file first.

GO_DIR       := src/go-api
NODE_DIR     := src/node-api
FRONTEND_DIR := src/frontend

# Loads <dir>/.env into the environment of the command that follows; fails with a hint if it is missing.
load_env = test -f .env || { echo "Missing $(1)/.env: cp $(1)/.env.example $(1)/.env"; exit 1; }; set -a; . ./.env; set +a

.PHONY: docker-build docker-up docker-down docker-logs run-go run-node run-frontend test test-go test-node test-frontend lint lint-go lint-node lint-frontend check

run-go:
	cd $(GO_DIR) && $(call load_env,$(GO_DIR)) && go run ./cmd/server

run-node:
	cd $(NODE_DIR) && $(call load_env,$(NODE_DIR)) && npm run dev

run-frontend:
	cd $(FRONTEND_DIR) && npm run dev

test: test-go test-node test-frontend

test-go:
	cd $(GO_DIR) && go test ./...

test-node:
	cd $(NODE_DIR) && npm test

test-frontend:
	cd $(FRONTEND_DIR) && npm test

lint: lint-go lint-node lint-frontend

lint-go:
	@cd $(GO_DIR) && out="$$(gofmt -l .)" && if [ -n "$$out" ]; then echo "gofmt needed on:"; echo "$$out"; exit 1; fi
	cd $(GO_DIR) && go vet ./...

lint-node:
	cd $(NODE_DIR) && npm run lint

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

check: lint test
	cd $(GO_DIR) && bash scripts/check_dependency_rule.sh

# Docker: the frontend build args (VITE_*) live in src/frontend/.env.local, which Compose does not
# read on its own, so it is passed explicitly. Changing them needs `make docker-build`.
COMPOSE := docker compose --env-file $(FRONTEND_DIR)/.env.local

docker-build:
	$(COMPOSE) build

docker-up:
	$(COMPOSE) up -d --build

docker-down:
	$(COMPOSE) down

docker-logs:
	$(COMPOSE) logs -f
