#!/usr/bin/env bash
set -euo pipefail
PORT="${FRONTEND_PORT:-8080}"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/")
if [[ "$code" != "200" ]]; then
  echo "FAIL: expected HTTP 200, got $code"
  exit 1
fi
echo "PASS: frontend HTTP 200"
