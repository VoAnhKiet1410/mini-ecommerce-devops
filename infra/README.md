# Infrastructure (Terraform)

AWS infrastructure for Mini E-commerce DevOps Platform (`ap-southeast-1`).

## Layout

| Path | Purpose |
|------|---------|
| `bootstrap/state/` | One-time S3 + DynamoDB for remote state (local state OK) |
| `modules/vpc/` | VPC, public/private subnets, single NAT |
| `modules/eks/` | EKS 1.29, single `t3.small` managed node group |
| `modules/ecr/` | ECR repos for happy-path services |
| `modules/rds/` | RDS PostgreSQL 16 (platform DB) |
| `modules/iam-github-oidc/` | GitHub Actions OIDC roles |
| `modules/iam-irsa/` | IRSA for ALB controller and External Secrets |
| `modules/secrets/` | Secrets Manager (RDS credentials) |
| `environments/aws/` | Root module wiring all modules |

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

(Wire via root module when variable is exposed — see `main.tf`.)

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
