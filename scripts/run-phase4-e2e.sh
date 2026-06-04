#!/usr/bin/env bash
# Phase 4 E2E — see run-phase4-e2e.ps1 (Windows: use .ps1)
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec pwsh -NoProfile -File "${REPO_ROOT}/scripts/run-phase4-e2e.ps1" "$@"
