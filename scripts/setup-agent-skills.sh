#!/usr/bin/env bash
# Install / refresh project agent skills (Skills CLI).
# Run from repo root: ./scripts/setup-agent-skills.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

packages=(
  "jeffallan/claude-skills@terraform-engineer"
  "jeffallan/claude-skills@devops-engineer"
  "aws/agent-toolkit-for-aws@aws-iam"
  "aws/agent-toolkit-for-aws@aws-observability"
  "aws/agent-toolkit-for-aws@aws-billing-and-cost-management"
  "xixu-me/skills@github-actions-docs"
  "miles990/claude-software-skills@devops-cicd"
  "absolutelyskilled/absolutelyskilled@docker-kubernetes"
)

echo "Installing agent skills into .agents/skills/ ..."
for pkg in "${packages[@]}"; do
  echo "  -> $pkg"
  npx --yes skills add "$pkg" -y
done

echo "Updating skills ..."
npx --yes skills update

if [[ ! -f .agents/skills/mini-ecommerce-devops/SKILL.md ]]; then
  echo "Missing .agents/skills/mini-ecommerce-devops/SKILL.md (pull from git)" >&2
  exit 1
fi

echo ""
echo "Done. Skills:"
ls -1 .agents/skills/
echo ""
echo "See AGENTS.md and docs/agent-skills.md"
