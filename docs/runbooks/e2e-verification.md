# E2E verification — secret/AWS-gated features

This runbook closes the "code-complete but never proven running" gap from the
project handoff. It verifies five features that stay green in CI by skipping
gracefully but were never exercised against a live AWS stack:

| # | Feature | Where it lives |
|---|---------|----------------|
| 1 | Infracost cost-diff PR comment | `.github/workflows/terraform-plan.yml` (`infracost` job) |
| 2 | Auto image-bump PR on the gitops repo | `.github/workflows/ci-build-push.yml` (`update-gitops` job) |
| 3 | cosign keyless signing + SBOM attestation | `ci-build-push.yml` (`build-push` job) |
| 4 | Local signature/attestation verification | `scripts/verify-image-signature.ps1` / `.sh` |
| 5 | Kyverno cluster-side signature enforcement | `scripts/install-kyverno.ps1` / `.sh` + `infra/kyverno/boutique-verify-images.yaml` |

Run everything in **one paid AWS window**. The stack is ephemeral — see
[aws-up.md](aws-up.md) for bring-up and [aws-down.md](aws-down.md) for teardown.
**Do not skip the teardown.**

Feature 1 is the only one that does **not** need a running cluster (it parses
HCL on a PR). Features 2–5 need the AWS stack up and CI green.

---

## Pre-flight — GitHub secrets

Set these in the **app repo** (`mini-ecommerce-devops`) →
**Settings → Secrets and variables → Actions**. The three `AWS_*` secrets are
already documented in [github-actions-setup.md](github-actions-setup.md) and
`CLAUDE.md`; the two below are the additional ones these features need.

| Secret | Needed by | Where to get the value |
|--------|-----------|------------------------|
| `AWS_ECR_ROLE_ARN` | 2, 3 | `terraform output -raw github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | (Terraform Plan) | `terraform output -raw github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | (Terraform Plan) | `voanhkiet1410-mini-ecommerce-tfstate-962765735385` |
| `INFRACOST_API_KEY` | 1 | Free at [infracost.io](https://www.infracost.io/); `infracost auth login` then `infracost configure get api_key` |
| `GITOPS_REPO_TOKEN` | 2 | Fine-grained PAT scoped to `mini-ecommerce-gitops`, permissions **Contents: RW** + **Pull requests: RW** |

Set the two extra secrets (run these yourself — do not commit values):

```powershell
gh secret set INFRACOST_API_KEY --repo VoAnhKiet1410/mini-ecommerce-devops
gh secret set GITOPS_REPO_TOKEN --repo VoAnhKiet1410/mini-ecommerce-devops
```

Confirm what is set:

```powershell
gh secret list --repo VoAnhKiet1410/mini-ecommerce-devops
```

---

## Feature 1 — Infracost cost-diff PR comment

**AWS required:** No (HCL parse only; the `infracost` job uses no AWS credentials).
**Secret:** `INFRACOST_API_KEY`.

1. Create a throwaway branch that touches infra, e.g. bump a tag or comment in
   `infra/environments/aws/`:

```powershell
git checkout -b test/infracost-verify
# make a trivial change under infra/environments/aws/ (e.g. edit a comment)
git commit -am "test: trigger infracost on PR"
git push -u origin test/infracost-verify
gh pr create --fill
```

2. Watch the PR checks:

```powershell
gh pr checks --watch
```

**Binary pass:** A sticky comment authored by **Infracost** appears on the PR
showing a monthly cost diff (e.g. *"Monthly cost will increase by $X"*). The
`infracost` job in the **Terraform Plan** run is green, not skipped.

**Fail/skip signal:** Job log prints `INFRACOST_API_KEY not set — cost estimate
skipped` → the secret is missing or not visible to the job.

Close the PR and delete the branch when done.

---

## Feature 2 — Auto image-bump PR on the gitops repo

**AWS required:** Yes (`update-gitops` is gated behind `verify-oidc.reachable == true`).
**Secret:** `GITOPS_REPO_TOKEN`.

1. With the AWS stack up and OIDC reachable, trigger CI on `main`:

```powershell
gh workflow run ci-build-push.yml --repo VoAnhKiet1410/mini-ecommerce-devops
gh run watch --repo VoAnhKiet1410/mini-ecommerce-devops
```

2. After `build-push` succeeds, check the gitops repo for the opened PR:

```powershell
gh pr list --repo VoAnhKiet1410/mini-ecommerce-gitops
```

**Binary pass:** A PR titled `ci: bump happy-path images to <sha>` exists on
`mini-ecommerce-gitops`, branch `ci/image-<sha>`, changing the four image tags
in `apps/online-boutique/overlays/aws/kustomization.yaml` to the new commit SHA.

**Fail/skip signal:** `update-gitops` job log prints `GITOPS_REPO_TOKEN not set —
gitops PR skipped`, or the `Bump image tags` step fails because the kustomization
image names do not match `frontend`/`productcatalogservice`/`cartservice`/`checkoutservice`.

Do **not** merge the PR unless you want Argo CD to redeploy. Close it after verifying.

---

## Feature 3 — cosign keyless signing + SBOM attestation

**AWS required:** Yes (runs inside `build-push`, which needs ECR + OIDC).
**Secret:** none beyond `AWS_ECR_ROLE_ARN` (cosign uses the workflow OIDC token).

1. The same CI run from Feature 2 signs each image after the Trivy gate. Confirm
   the run is green and note the commit SHA:

```powershell
gh run view --repo VoAnhKiet1410/mini-ecommerce-devops --log | Select-String "cosign sign","Attach SBOM attestation"
```

2. Confirm the signature artifacts exist in ECR (a `.sig` / `.att` tag pair sits
   next to each image digest):

```powershell
aws ecr list-images --repository-name mini-ecommerce/frontend --region ap-southeast-1
```

**Binary pass:** The `Sign image (cosign keyless via GitHub OIDC)` and
`Attach SBOM attestation` steps are green, signing is done against
`...@<digest>` (immutable digest, not a mutable tag), and ECR shows signature
artifacts. Full proof is Feature 4.

---

## Feature 4 — Local signature/attestation verification

**AWS required:** Yes (resolves the digest from ECR).
**Prereqs:** AWS CLI authenticated; cosign installed
(`winget install sigstore.cosign` / `brew install cosign`).

```powershell
# Windows — verify the image CI just signed
.\scripts\verify-image-signature.ps1 -Service frontend -Tag <git-sha>
.\scripts\verify-image-signature.ps1 -Service cartservice -Tag <git-sha>
```

```bash
# Linux/Mac
./scripts/verify-image-signature.sh frontend <git-sha>
```

**Binary pass:** The script prints
`PASS: mini-ecommerce/<service>:<tag> is signed by GitHub Actions
(VoAnhKiet1410/mini-ecommerce-devops) and has a verified SBOM attestation`.
Internally `cosign verify` returns the certificate identity
`https://github.com/VoAnhKiet1410/mini-ecommerce-devops/.../ci-build-push.yml@refs/heads/main`
and issuer `https://token.actions.githubusercontent.com`.

**Fail signal:** `FAIL: image ... not found in ECR` (CI did not push), or
`FAIL: signature verification failed` (identity/issuer mismatch or unsigned image).

---

## Feature 5 — Kyverno cluster-side enforcement

**AWS required:** Yes (EKS cluster + signed images in ECR).
**Prereqs:** Argo CD healthy, happy-path pods Running, Feature 3/4 passing.

1. Install Kyverno and apply the policy in **Audit** mode first (observe, no block):

```powershell
.\scripts\install-kyverno.ps1 -AuditOnly
```

2. Switch to **Enforce** mode:

```powershell
.\scripts\install-kyverno.ps1
```

3. Confirm the policy is loaded:

```powershell
kubectl get clusterpolicy verify-boutique-images
```

4. Negative test — try to run an **unsigned** image in the `boutique` namespace:

```powershell
kubectl run rogue --image=nginx:latest -n boutique
```

**Binary pass:** The `kubectl run rogue` command is **rejected at admission**
with an error from Kyverno similar to:

```
Error from server: admission webhook "mutate.kyverno.svc-fail" denied the request:
resource Pod/boutique/rogue was blocked due to the following policies:
verify-boutique-images:
  verify-cosign-signature: failed to verify image nginx:latest ...
```

A genuine boutique pod (image signed by CI, matching
`962765735385.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/*`) is admitted normally.

**ECR auth note:** Kyverno pulls signature OCI artifacts from ECR using the
`ecr-pull-secret` the install script creates from `aws ecr get-login-password`.
That token expires after 12 hours — re-run `install-kyverno.ps1` before a demo.

Clean up the negative test (it should not exist if enforcement worked):

```powershell
kubectl delete pod rogue -n boutique --ignore-not-found
```

---

## Done criteria

| Feature | Binary pass |
|---------|-------------|
| 1 Infracost | Sticky Infracost cost-diff comment on the infra PR |
| 2 GitOps PR | `ci: bump happy-path images to <sha>` PR exists on `mini-ecommerce-gitops` |
| 3 Sign + SBOM | `cosign sign` + `Attach SBOM attestation` steps green; signing on `@<digest>` |
| 4 Verify | `verify-image-signature` prints `PASS` with the repo OIDC identity |
| 5 Kyverno | Unsigned pod rejected at admission; signed boutique pod admitted |

After all five pass, tear the stack down: see [aws-down.md](aws-down.md)
(`terraform destroy` + GitHub secrets cleanup).
