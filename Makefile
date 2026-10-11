# Monorepo task runner (works from Git Bash on Windows, Linux and macOS).
#
# Environment variables read by the services (override on the command line,
# e.g. `make run-go PORT=9090 NODE_API_URL=http://localhost:8081`):
#   PORT                 listen port. go-api default 8080, node-api default 8081
#   NODE_API_URL         go-api only: base URL of node-api (default http://localhost:8081)
#   NODE_API_TIMEOUT_MS  go-api only: timeout of the call to node-api, in ms (default 5000)
#   DIAGONAL_TOLERANCE   node-api only: diagonal tolerance (default 1e-9)

GO_DIR   := src/go-api
NODE_DIR := src/node-api

.PHONY: test test-go test-node lint lint-go lint-node run-node run-go check

test: test-go test-node

test-go:
	cd $(GO_DIR) && go test ./...

test-node:
	cd $(NODE_DIR) && npm test

lint: lint-go lint-node

lint-go:
	@cd $(GO_DIR) && out="$$(gofmt -l .)" && if [ -n "$$out" ]; then echo "gofmt needed on:"; echo "$$out"; exit 1; fi
	cd $(GO_DIR) && go vet ./...

lint-node:
	cd $(NODE_DIR) && npm run lint

run-node:
	cd $(NODE_DIR) && npm run dev

run-go:
	cd $(GO_DIR) && go run ./cmd/server

check: lint test
	cd $(GO_DIR) && bash scripts/check_dependency_rule.sh
