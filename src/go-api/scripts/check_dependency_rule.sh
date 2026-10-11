#!/usr/bin/env bash
# Enforces domain <- application <- adapters <- cmd using the real import graph.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
check() { # package pattern, forbidden regex
  local bad
  bad=$(go list -deps -f '{{.ImportPath}}' "$1" | grep -E "$2" || true)
  if [ -n "$bad" ]; then
    echo "VIOLATION: $1 must not depend on:"; echo "$bad"; fail=1
  fi
}

# Domain: stdlib only (no other internal layer, no third-party module).
check ./internal/domain '^(go-api/internal/(application|adapters|config)|github\.com|gonum\.org|golang\.org/x)'
# Application: depends on domain only.
check ./internal/application '^(go-api/internal/(adapters|config)|github\.com|gonum\.org|golang\.org/x)'
# Adapters must not depend on each other or on config / cmd.
for pkg in inbound/http outbound/gonumqr outbound/nodeapi outbound/logging; do
  others=$(echo "inbound/http outbound/gonumqr outbound/nodeapi outbound/logging" | tr ' ' '\n' | grep -v "^$pkg$" | sed 's#.*#go-api/internal/adapters/&#' | paste -sd'|')
  check "./internal/adapters/$pkg" "^(${others}|go-api/internal/config|go-api/cmd)"
done

[ "$fail" -eq 0 ] && echo "dependency rule OK"
exit "$fail"
