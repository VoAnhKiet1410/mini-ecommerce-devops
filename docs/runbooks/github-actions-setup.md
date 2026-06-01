# GitHub Actions setup (Phase 2)

Configure repository **Settings → Secrets and variables → Actions** after `terraform apply`.

## Secrets

| Secret | Source (`terraform output`) |
|--------|-----------------------------|
| `AWS_ECR_ROLE_ARN` | `github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | `github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | S3 bucket from `infra/bootstrap/state` (same as `backend.hcl`) |

```bash
cd infra/environments/aws
terraform output -raw github_actions_ecr_role_arn
terraform output -raw github_actions_terraform_plan_role_arn
```

## Repository variables

| Variable | Example |
|----------|---------|
| `GITHUB_ORG` | `VoAnhKiet1410` |
| `GITHUB_REPO` | `mini-ecommerce-devops` |

Used by `terraform-plan.yml` for `TF_VAR_github_org` / `TF_VAR_github_repo` (no `terraform.tfvars` in git).

## Verify CI build

1. Merge Phase 2 workflows to `main`.
2. Push a change under `src/` or run **workflow_dispatch** on **CI Build and Push to ECR**.
3. Confirm green run and images in ECR: `mini-ecommerce/<service>`.

## Image URIs (for Phase 3 GitOps)

```
<account>.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/frontend:<git-sha>
```

Record `<git-sha>` from the successful workflow run.

## Verify Terraform plan on PR

Open a PR that touches `infra/`. Expect:

- Checkov in Actions log
- PR comment with `terraform plan` output

**Note:** Plan role is read-only; `terraform apply` stays manual (see [aws-up.md](aws-up.md)).
