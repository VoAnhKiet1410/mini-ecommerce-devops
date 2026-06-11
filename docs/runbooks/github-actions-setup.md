# GitHub Actions setup (Phase 2)

Configure repository **Settings → Secrets and variables → Actions** after `terraform apply`.

## Secrets

| Secret | Source (`terraform output`) |
|--------|-----------------------------|
| `AWS_ECR_ROLE_ARN` | `github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | `github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | S3 bucket from `infra/bootstrap/state` (same as `backend.hcl`) |
| `INFRACOST_API_KEY` | Free key from [infracost.io](https://www.infracost.io/) — `infracost auth login` (optional; cost comment skipped if absent) |
| `GITOPS_REPO_TOKEN` | Fine-grained PAT scoped to `mini-ecommerce-gitops` (optional; gitops PR skipped if absent — see below) |

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

**Trivy (image scan):** `ci-build-push.yml` runs a **gate** step that fails the job on `CRITICAL` (`exit-code: "1"`). A second step uploads SARIF for `CRITICAL,HIGH` with `exit-code: "0"` so `HIGH` findings are visible but do not block ECR push. Download artifacts `trivy-<service>` from the workflow run to review findings.

## Infracost cost estimate on PR (optional)

`terraform-plan.yml` has an `infracost` job that posts a sticky PR comment with the monthly cost diff of `infra/environments/aws`. It parses HCL only — no AWS credentials and no `terraform init`.

1. Sign up free at [infracost.io](https://www.infracost.io/) and get an API key (`infracost auth login` locally, then `infracost configure get api_key`).
2. Add the key as secret `INFRACOST_API_KEY`.
3. Open a PR touching `infra/**` — expect a comment like `Monthly cost will increase by $X`.

If the secret is missing the job logs `cost estimate skipped` and stays green.

## GitOps image-bump PR (closing the loop)

After a successful `build-push` on `main`, the `update-gitops` job in `ci-build-push.yml` opens a PR against `mini-ecommerce-gitops` that pins the four happy-path images to the new commit SHA (via `kustomize edit set image` in `overlays/aws`). Argo CD deploys the change **after the PR is reviewed and merged** — the human gate stays.

**Setup:**

1. Create a **fine-grained PAT**: GitHub → Settings → Developer settings → Fine-grained tokens.
   - Repository access: only `mini-ecommerce-gitops`.
   - Permissions: **Contents: Read and write**, **Pull requests: Read and write**.
2. Add it as secret `GITOPS_REPO_TOKEN` in the **app repo** (`mini-ecommerce-devops`).

**Requirement in the gitops repo:** deployment manifests under `base/` must reference images by their full ECR name (`<account>.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/<service>`), so the `images:` transformer that CI writes into `overlays/aws/kustomization.yaml` matches. `kustomize edit set image` creates the `images:` entries on first run if they do not exist.

If the secret is missing the job logs `gitops PR skipped` and stays green.

## Image signing + SBOM (supply chain)

`build-push` signs every image that passed the Trivy gate with **cosign keyless** (GitHub OIDC certificate) and attaches a **syft SPDX SBOM** as a cosign attestation. No extra secrets needed — see [supply-chain.md](supply-chain.md) for verification.

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
   - **Infracost** job (if `INFRACOST_API_KEY` set): sticky cost-diff comment on the PR
   - **Security Scan** workflow: Checkov on `infra/` (baseline), Trivy fs on `infra/` only
4. `gh run list --workflow "Terraform Plan" --limit 3` should show a completed run.

**Note:** Plan role is read-only; `terraform apply` stays manual (see [aws-up.md](aws-up.md)).
