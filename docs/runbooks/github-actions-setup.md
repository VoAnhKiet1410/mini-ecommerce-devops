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

**Không cần tạo.** `terraform-plan.yml` lấy org/repo từ `github.repository_owner` và tên repo hiện tại (GitHub **cấm** biến Actions tên bắt đầu bằng `GITHUB_`).

Đảm bảo `github_org` / `github_repo` trong `terraform.tfvars` khớp repo thật (`VoAnhKiet1410` / `mini-ecommerce-devops`).

**OIDC trust (sau `terraform apply`):**

| Role | GitHub `sub` claim được phép |
|------|------------------------------|
| ECR push | `repo:<org>/<repo>:ref:refs/heads/main` |
| Terraform plan | `repo:<org>/<repo>:pull_request` |

`workflow_dispatch` trên nhánh `main` dùng cùng claim ECR như push. PR workflow **không** assume role ECR.

## Verify CI build

1. Merge Phase 2 workflows to `main`.
2. Push a change under `src/` or run **workflow_dispatch** on **CI Build and Push to ECR**.
3. Confirm green run and images in ECR: `mini-ecommerce/<service>`.

## Image URIs (for Phase 3 GitOps)

```
<account>.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/frontend:<git-sha>
```

Record `<git-sha>` from the successful workflow run.

## Print secret values (local)

After `terraform apply`:

```powershell
.\scripts\print-github-actions-secrets.ps1
```

Paste the three lines into **Settings → Secrets and variables → Actions**. The CLI `gh secret set` needs a token with `repo` + `admin:repo_hook` (or fine-grained **Actions secrets** write); otherwise set secrets in the GitHub UI.

If you change `infra/modules/iam-github-oidc` (e.g. plan role policy), run `terraform apply` again before re-testing PR workflows.

## Verify Terraform plan on PR (Task 2.2 E2E)

1. Ensure all three secrets above exist (`AWS_ECR_ROLE_ARN` is only needed for image push).
2. Open a PR that touches `infra/**` (or this workflow / `.checkov.baseline`).
3. Expect on the PR:
   - **Terraform Plan** workflow: `terraform fmt`, `validate`, `plan`, Checkov (baseline), sticky PR comment `<!-- terraform-plan-comment -->`
   - **Security Scan** workflow: Checkov on `infra/` (baseline), Trivy fs on `infra/` only
4. `gh run list --workflow "Terraform Plan" --limit 3` should show a completed run.

**Note:** Plan role is read-only; `terraform apply` stays manual (see [aws-up.md](aws-up.md)).
