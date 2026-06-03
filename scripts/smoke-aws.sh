#!/usr/bin/env bash
set -euo pipefail
ALB="${1:?Usage: smoke-aws.sh <alb-hostname>}"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB}/")
if [[ "$code" == "200" ]]; then
  echo "PASS: frontend HTTP 200"
else
  echo "FAIL: expected HTTP 200, got $code"
  exit 1
fi
