# Agent instructions — Mini E-commerce DevOps Platform

Project agent skills live in [`.agents/skills/`](.agents/skills/). Cursor rule: [`.cursor/rules/mini-ecommerce-devops.mdc`](.cursor/rules/mini-ecommerce-devops.mdc).

## Onboarding (new clone)

```bash
# Bash
./scripts/setup-agent-skills.sh

# Windows
.\scripts\setup-agent-skills.ps1
```

The scripts install packages from `skills-lock.json` sources. The **mini-ecommerce-devops** skill is committed in git (not from npm).

## Start here

1. Read **[mini-ecommerce-devops](.agents/skills/mini-ecommerce-devops/SKILL.md)** — layout, conventions, skill routing.
2. Load a domain skill only when the task needs it.

## Installed skills

| Skill | Source | Use for |
|-------|--------|---------|
| [mini-ecommerce-devops](.agents/skills/mini-ecommerce-devops/SKILL.md) | Project | Paths, runbooks, guardrails |
| [terraform-engineer](.agents/skills/terraform-engineer/SKILL.md) | jeffallan/claude-skills | `infra/` Terraform |
| [devops-engineer](.agents/skills/devops-engineer/SKILL.md) | jeffallan/claude-skills | Platform ops, K8s, Docker |
| [aws-iam](.agents/skills/aws-iam/SKILL.md) | aws/agent-toolkit-for-aws | IAM, OIDC, IRSA |
| [aws-observability](.agents/skills/aws-observability/SKILL.md) | aws/agent-toolkit-for-aws | CloudWatch / observability |
| [aws-billing-and-cost-management](.agents/skills/aws-billing-and-cost-management/SKILL.md) | aws/agent-toolkit-for-aws | Cost for demo stack |
| [github-actions-docs](.agents/skills/github-actions-docs/SKILL.md) | xixu-me/skills | `.github/workflows/` |
| [devops-cicd](.agents/skills/devops-cicd/SKILL.md) | miles990/claude-software-skills | CI/CD design |
| [docker-kubernetes](.agents/skills/docker-kubernetes/SKILL.md) | absolutelyskilled | Containers, EKS |

Details: [docs/agent-skills.md](docs/agent-skills.md).

## Hard rules

- Do **not** add `terraform apply` to CI.
- Apply Terraform only from `infra/environments/aws` with a reviewed `tfplan`.
- Prefer `docs/runbooks/` over ad-hoc bring-up steps.
- Reply in **Vietnamese** when the user writes in Vietnamese.

## Maintain skills

```bash
npx skills check
npx skills update
```

Add a skill: `npx skills add <owner/repo@skill> -y` — then update `scripts/setup-agent-skills.*` and [docs/agent-skills.md](docs/agent-skills.md).
