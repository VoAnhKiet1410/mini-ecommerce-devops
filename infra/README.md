# Infrastructure (Terraform)

AWS infrastructure for Mini E-commerce DevOps Platform (`ap-southeast-1`).

## Layout

| Path | Purpose |
|------|---------|
| `bootstrap/state/` | One-time S3 + DynamoDB for remote state (local state OK) |
| `modules/vpc/` | VPC, public/private subnets, single NAT |
| `modules/eks/` | EKS 1.30 (default), single `t3.small` managed node group |
| `modules/ecr/` | ECR repos for happy-path services |
| `modules/rds/` | RDS PostgreSQL 16 (platform DB) |
| `modules/iam-github-oidc/` | GitHub Actions OIDC roles |
| `modules/iam-irsa/` | IRSA for ALB controller and External Secrets |
| `modules/secrets/` | Secrets Manager (RDS credentials) |
| `environments/aws/` | Root module wiring all modules |

## Agent skills

Terraform/IAM tasks in this repo: see [AGENTS.md](../AGENTS.md) and skill **terraform-engineer** / **aws-iam** under [`.agents/skills/`](../.agents/skills/).

## Prerequisites

- Terraform >= 1.5
- AWS CLI profile
- GitHub org

## Bootstrap remote state (once)

```bash
cd infra/bootstrap/state
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Bootstrap creates: versioning, encryption, TLS-only bucket policy, lifecycle on noncurrent versions.

## Deploy AWS environment

```bash
cd infra/environments/aws
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl   # edit bucket if different
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan
```

**Apply is manual only** — not from CI. Expect ~15–25 minutes.

### GitHub OIDC provider already exists?

If `terraform apply` fails on duplicate OIDC provider, set in `terraform.tfvars`:

```hcl
create_github_oidc_provider = false
```

Set in `infra/environments/aws/terraform.tfvars` (wired in root `main.tf`).

## Teardown

```bash
cd infra/environments/aws
terraform destroy
```

See [docs/runbooks/aws-down.md](../docs/runbooks/aws-down.md).

## Phase 2 — GitHub Actions (CI/CD + ECR)

After AWS apply, configure OIDC secrets and run CI:

- Workflows: `.github/workflows/ci-build-push.yml`, `terraform-plan.yml`, `security-scan.yml`
- Setup: [docs/runbooks/github-actions-setup.md](../docs/runbooks/github-actions-setup.md)

`terraform apply` remains **manual**; CI only builds images and runs `terraform plan` on PRs.

## Security notes

- **GitHub OIDC:** ECR role trusts `ref:refs/heads/main` only; Terraform plan role trusts `pull_request` only. Re-apply IAM after changing `github_org` / `github_repo`.
- **EKS API:** Public endpoint is enabled for laptop `kubectl` (demo). Set `cluster_endpoint_public_access_cidrs` in `terraform.tfvars` to your IP/32 when possible.
- **Checkov:** Portfolio demo baseline in `infra/.checkov.baseline` (S3 state bucket, single-AZ RDS, EKS public API, etc.). `security-scan.yml` fails on **new** findings only. `terraform-plan.yml` uses `soft_fail: true` for Checkov so plan comments still post.

## Checkov

Scans run in GitHub Actions (`security-scan.yml`, `terraform-plan.yml`). Local:

```bash
docker run --rm -v "$(pwd):/repo" bridgecrew/checkov -d /repo/infra \
  --config-file /repo/.checkov.yml --baseline /repo/infra/.checkov.baseline
```

Regenerate baseline after intentional infra changes:

```bash
docker run --rm -v "$(pwd):/repo" -w /repo bridgecrew/checkov -d /repo/infra \
  --config-file /repo/.checkov.yml --framework terraform --create-baseline
# writes infra/.checkov.baseline — review diff before commit
```
