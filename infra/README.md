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
- AWS CLI configured (`your-aws-profile` or default)
- Replace placeholders: `YOUR_ORG`, `YOUR_AWS_ACCOUNT_ID`, unique S3 bucket name

## Bootstrap remote state (once)

```bash
cd infra/bootstrap/state
cp terraform.tfvars.example terraform.tfvars
# Edit state_bucket_name to a globally unique name
terraform init
terraform apply
```

Update `infra/environments/aws/backend.tf` with the bucket name from bootstrap output.

## Deploy AWS environment

```bash
cd infra/environments/aws
cp terraform.tfvars.example terraform.tfvars
# Edit github_org and other values
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

**Apply is manual only** — not from CI. Expect ~15–25 minutes.

## Teardown

```bash
cd infra/environments/aws
terraform destroy
```

See [docs/runbooks/aws-down.md](../docs/runbooks/aws-down.md).
