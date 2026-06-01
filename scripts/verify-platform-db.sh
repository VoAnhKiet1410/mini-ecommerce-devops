#!/usr/bin/env bash
set -euo pipefail
source .env 2>/dev/null || true
PGPASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}" psql \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-platform}" \
  -d "${POSTGRES_DB:-platform}" \
  -c "SELECT 1 AS platform_db_ok;"
echo "Platform PostgreSQL connectivity OK"
