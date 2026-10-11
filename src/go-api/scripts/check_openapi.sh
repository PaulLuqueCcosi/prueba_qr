#!/usr/bin/env bash
# Lightweight spec guard: every path+method documented in the embedded OpenAPI spec
# must exist in a running go-api (not answer 404), and /openapi.yaml must serve the spec.
# Usage: bash scripts/check_openapi.sh [base-url]   (default http://localhost:8080)
set -euo pipefail
cd "$(dirname "$0")/.."

base="${1:-http://localhost:8080}"
spec=internal/adapters/inbound/http/openapi/openapi.yaml
fail=0

path=""
while IFS= read -r line; do
  if [[ "$line" =~ ^\ \ (/[^:]*):$ ]]; then
    path="${BASH_REMATCH[1]}"
  elif [[ -n "$path" && "$line" =~ ^\ \ \ \ (get|post|put|delete|patch):$ ]]; then
    method="${BASH_REMATCH[1]}"
    body=()
    [ "$method" != "get" ] && body=(-d '{}')
    status=$(curl -s -o /dev/null -w '%{http_code}' -X "${method^^}"       -H 'Content-Type: application/json' "${body[@]}" "$base$path" 2>/dev/null || true)
    if [ "$status" = "404" ] || [ -z "$status" ]; then
      echo "MISSING: ${method^^} $path is documented but answered '${status:-no response}'"; fail=1
    else
      echo "ok: ${method^^} $path -> $status"
    fi
  elif [[ "$line" =~ ^[a-z] ]]; then
    path=""
  fi
done < "$spec"

if ! diff -q <(curl -s "$base/openapi.yaml") "$spec" >/dev/null; then
  echo "MISMATCH: /openapi.yaml differs from $spec (rebuild the server?)"; fail=1
fi

[ "$fail" -eq 0 ] && echo "openapi OK"
exit "$fail"
