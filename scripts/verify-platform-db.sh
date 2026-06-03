#!/usr/bin/env bash
set -euo pipefail
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(sed 's/\r$//' .env)
  set +a
fi

PG_USER="${POSTGRES_USER:-platform}"
PG_DB="${POSTGRES_DB:-platform}"
PG_PASS="${POSTGRES_PASSWORD:-change-me-local-only}"
PG_HOST="${POSTGRES_HOST:-localhost}"
PG_PORT="${POSTGRES_PORT:-5432}"

run_psql() {
  PGPASSWORD="$PG_PASS" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT 1 AS platform_db_ok;"
}

run_compose_exec() {
  docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -c "SELECT 1 AS platform_db_ok;"
}

if docker compose ps postgres --status running >/dev/null 2>&1; then
  run_compose_exec
elif command -v psql >/dev/null 2>&1; then
  run_psql
else
  echo "FAIL: postgres container is not running and psql is not installed" >&2
  exit 1
fi

echo "Platform PostgreSQL connectivity OK"
