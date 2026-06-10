# Handoff — Mini E-commerce DevOps Platform

| Field | Value |
|-------|--------|
| **Cập nhật** | 2026-06-09 |
| **Branch** | `main` |
| **Remote** | `https://github.com/VoAnhKiet1410/mini-ecommerce-devops.git` |
| **Working tree** | Sạch — chỉ `.agents/`, `.cursor/`, `tfplan` binary (tất cả đã gitignore) |
| **AWS runtime** | **DOWN** — đã `terraform destroy` toàn bộ; cần bootstrap lại trước khi demo |
| **Spec / Plan** | `docs/superpowers/specs/2026-06-01-mini-ecommerce-devops-platform-spec.md`, `docs/superpowers/plans/2026-06-01-mini-ecommerce-devops-platform.md` |

**Resume nhanh:** Code tất cả phase đã commit và push. CI đã fix để không fail khi AWS down. Việc còn lại: chạy E2E một lần trên AWS (Phase 2 CI green + Phase 4 Grafana screenshot).

---

## 1. Mục tiêu dự án

Xây **nền tảng DevOps portfolio** quanh [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (Online Boutique), phạm vi **happy-path**: `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice` (+ Redis, dependency tối thiểu như `currencyservice` cho Compose).

---

## 2. Kiến trúc đã chốt

| Chủ đề | Quyết định |
|--------|------------|
| **Approach** | **A — Platform shell:** app giữ upstream (Redis cart, catalog in-memory); RDS/Compose Postgres là **platform DB** |
| **Repo** | **2 repo public:** `VoAnhKiet1410/mini-ecommerce-devops` (app + `infra/`), `VoAnhKiet1410/mini-ecommerce-gitops` (Kustomize) |
| **Region** | `ap-southeast-1` |
| **EKS** | 1× Managed Node Group, On-Demand **`m7i-flex.large`** 1.30, cluster `mini-ecommerce-devops` |
| **State bucket** | `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (tạo lại khi bootstrap) |
| **Secrets** | AWS Secrets Manager + ESO (sync sau khi có cluster); local `.env` |

---

## 3. Trạng thái các phase

### Phase 0 — Foundation ✅ 100%
### Phase 1 — AWS core (code ✅, runtime down)
### Phase 2 — CI/CD (code ✅, E2E chờ AWS + secrets)
### Phase 3 — GitOps ✅ 100% E2E (đã verify khi có cluster)
### Phase 4 — Observability (code ✅, E2E chờ AWS)
### Phase 5 — Hardening (Trivy gate ✅, Route 53/ACM deferred)

---

## 4. Những gì đã commit (working tree sạch)

| Vùng | Trạng thái |
|------|-----------|
| Terraform modules + env | ✅ — EKS 1.30, public endpoint, RDS `override_special` |
| CI workflows + Checkov | ✅ — `ci-build-push.yml` có `check-aws-secrets` skip graceful |
| GitOps scripts (install-aws-lbc, install-eso, install-argocd, install-monitoring) | ✅ |
| Phase 4 scripts (verify-phase4, run-phase4-e2e, capture-grafana-screenshot) | ✅ |
| Observability (helm-values, CloudWatch module, Grafana dashboard JSON) | ✅ |
| README CV bullets, demo-checklist | ✅ |
| `.gitignore` fix — tfplan + .agents/ | ✅ 2026-06-09 |
| `dependabot.yml` mở rộng — gomod (4 Go services) + pip (emailservice) | ✅ 2026-06-09 |

---

## 5. Lỗi đã fix (2026-06-09)

| Vấn đề | Fix |
|--------|-----|
| CI fail khi AWS down (thiếu `AWS_ECR_ROLE_ARN`) | Thêm `check-aws-secrets` job; `build-push` skip gracefully |
| `tfplan` binary untracked | Thêm `tfplan`, `*.tfplan` vào `.gitignore` |
| `.agents/` untracked | Thêm `.agents/` vào `.gitignore` |
| `dependabot.yml` thiếu Go module + Python | Thêm `gomod` 4 services + `pip` emailservice |

---

## 6. Task còn lại (tất cả cần AWS)

| # | Task | Cần gì |
|---|------|--------|
| **A** | Phase 2 CI E2E — workflow green + image trên ECR | Bootstrap + terraform apply + GitHub secrets |
| **B** | Phase 4 E2E — Grafana dashboard verify | EKS cluster + install-monitoring + verify-phase4 |
| **C** | Screenshot Grafana → README | Sau B: `capture-grafana-screenshot.ps1` |

---

## 7. Thứ tự khi cần demo AWS

```powershell
# 1. Bootstrap state (đã destroy trước đó)
cd infra/bootstrap/state
terraform apply

# 2. Apply AWS stack (~15 phút)
cd infra/environments/aws
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan

# 3. Config kubectl
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops

# 4. Install tooling
.\scripts\install-aws-lbc.ps1
.\scripts\install-eso.ps1
.\scripts\install-argocd.ps1

# 5. Config GitHub secrets (lấy ARN từ terraform output)
# AWS_ECR_ROLE_ARN = terraform output -raw github_actions_ecr_role_arn
# AWS_TERRAFORM_PLAN_ROLE_ARN = terraform output -raw github_actions_terraform_plan_role_arn
# AWS_TF_STATE_BUCKET = voanhkiet1410-mini-ecommerce-tfstate-962765735385
# → xem docs/runbooks/github-actions-setup.md

# 6. Trigger CI (push bất kỳ src/** change, hoặc workflow_dispatch)
# → kiểm tra Actions tab — test-go PASS, build-push PASS, ECR có image

# 7. Phase 4 E2E (bao gồm monitoring + screenshot)
.\scripts\run-phase4-e2e.ps1   # cluster đang chạy, bỏ qua -ApplyInfra

# 8. QUAN TRỌNG: destroy sau demo
terraform destroy
```

---

## 8. Quyết định kỹ thuật quan trọng

1. **State bucket**: `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (S3 tên chữ thường).
2. **EKS version**: 1.30 — không dùng 1.29 AMI; không nhảy 2 minor.
3. **EKS API**: public + private endpoint (demo only; `kubectl` từ laptop cần public).
4. **RDS password**: `random_password` với `override_special` — tránh `/`, `@`, `"`, space.
5. **IRSA LBC**: policy gắn trong `infra/modules/iam-irsa` — không tải IAM JSON thủ công.
6. **CI skip**: `check-aws-secrets` job output → `build-push` có `if: available == 'true'`.
7. **Ephemeral cost model** — destroy khi idle; không tối ưu HA/multi-AZ.
8. **AWS account**: `962765735385`, region: `ap-southeast-1`, GitHub org: `VoAnhKiet1410`.

---

*Handoff: factual, có evidence, resume từ §7. Cập nhật sau mỗi milestone.*
