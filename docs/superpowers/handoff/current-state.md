# Handoff — Mini E-commerce DevOps Platform

| Field | Value |
|-------|--------|
| **Cập nhật** | 2026-06-10 |
| **Branch** | `main` |
| **Remote** | `https://github.com/VoAnhKiet1410/mini-ecommerce-devops.git` |
| **Working tree** | Sạch — chỉ `.cursor/` untracked (gitignored) |
| **AWS runtime** | **DOWN** — `terraform destroy` hoàn tất 2026-06-10; cần bootstrap lại trước khi demo |
| **Spec / Plan** | `docs/superpowers/specs/2026-06-01-mini-ecommerce-devops-platform-spec.md`, `docs/superpowers/plans/2026-06-01-mini-ecommerce-devops-platform.md` |

**Resume nhanh:** Dự án **hoàn chỉnh**. Tất cả phase đã verify E2E trên AWS. CI green. Grafana screenshot đã commit. AWS đã destroy. Chỉ cần bootstrap lại khi demo tiếp.

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
| **State bucket** | `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (bootstrap vẫn còn; không cần tạo lại) |
| **Secrets** | AWS Secrets Manager + ESO (sync sau khi có cluster); local `.env` |

---

## 3. Trạng thái các phase

### Phase 0 — Foundation ✅ 100%
### Phase 1 — AWS core ✅ 100% (Terraform apply + EKS verified 2026-06-10)
### Phase 2 — CI/CD ✅ 100% (CI green, 4 images pushed to ECR 2026-06-10)
### Phase 3 — GitOps ✅ 100% (Argo CD sync, ALB HTTP 200, 6 pods Running 2026-06-10)
### Phase 4 — Observability ✅ 100% (Grafana + Prometheus + CloudWatch alarms verified 2026-06-10)
### Phase 5 — Hardening ✅ (Trivy gate ✅, Route 53/ACM deferred)

---

## 4. Những gì đã commit (working tree sạch, latest commit: 2dd11f1)

| Vùng | Trạng thái |
|------|-----------|
| Terraform modules + env | ✅ — EKS 1.30, public endpoint, RDS `override_special` |
| CI workflows + Checkov | ✅ — `ci-build-push.yml` có `check-aws-secrets` skip graceful |
| GitOps scripts (install-aws-lbc, install-eso, install-argocd, install-monitoring) | ✅ |
| Phase 4 scripts (verify-phase4, run-phase4-e2e, capture-grafana-screenshot) | ✅ |
| Observability (helm-values 512Mi Grafana, CloudWatch module, Grafana dashboard JSON) | ✅ |
| README CV bullets, demo-checklist | ✅ |
| `docs/assets/grafana-cluster-overview.png` | ✅ 2026-06-10 — screenshot thật (81KB, live data) |
| `.gitignore` fix — tfplan + .agents/ | ✅ |
| `dependabot.yml` mở rộng — gomod (4 Go services) + pip (emailservice) | ✅ |

---

## 5. Lỗi đã fix (2026-06-10, session này)

| Vấn đề | Fix |
|--------|-----|
| Secrets Manager secret scheduled for deletion (từ destroy cũ) | `delete-secret --force-delete-without-recovery` → re-apply terraform |
| Grafana `/api/login` removed in Grafana 13 | Switch sang service account token API |
| Grafana OOMKilled (256Mi limit) | Tăng memory limit lên 512Mi trong helm-values |
| Port-forward instability dưới browser load | Port-forward trực tiếp tới pod thay vì service |
| Blank screenshot (kiosk=tv mode) | Dùng `auth_token` URL param + waitForSelector + hide dialogs |
| ALB + security groups orphaned block VPC delete | Xóa thủ công qua AWS CLI trong khi terraform destroy chạy |
| ECR repos not empty block terraform destroy | `aws ecr delete-repository --force` cho 4 repos |

---

## 6. Task còn lại

**Không có.** Dự án hoàn chỉnh cho mục tiêu portfolio.

Có thể mở rộng sau nếu muốn:
- Route 53 custom domain + ACM TLS
- HPA / cluster autoscaler
- Cost optimization (Spot instances)

---

## 7. Thứ tự khi cần demo AWS

```powershell
# 1. Apply AWS stack (~15 phút) — Bootstrap state VẪN CÒN, bỏ qua bước bootstrap
cd infra/environments/aws
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan

# 2. Config kubectl
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops

# 3. Install tooling
.\scripts\install-aws-lbc.ps1
.\scripts\install-eso.ps1
.\scripts\install-argocd.ps1

# 4. Config GitHub secrets (lấy ARN từ terraform output)
# AWS_ECR_ROLE_ARN = terraform output -raw github_actions_ecr_role_arn
# AWS_TERRAFORM_PLAN_ROLE_ARN = terraform output -raw github_actions_terraform_plan_role_arn
# AWS_TF_STATE_BUCKET = voanhkiet1410-mini-ecommerce-tfstate-962765735385
# → xem docs/runbooks/github-actions-setup.md

# 5. Trigger CI (push bất kỳ src/** change, hoặc workflow_dispatch)
# → kiểm tra Actions tab — build-push PASS, ECR có image

# 6. Phase 4 E2E (monitoring + verify)
$env:GRAFANA_ADMIN_PASSWORD = "your-lab-password"
.\scripts\install-monitoring.ps1
.\scripts\verify-phase4.ps1

# 7. QUAN TRỌNG: destroy sau demo
terraform destroy
# Nếu terraform destroy bị block bởi ALB/SG orphaned từ K8s:
# aws elbv2 delete-load-balancer --load-balancer-arn <arn>
# aws ec2 delete-security-group --group-id <sg-id>
# aws ecr delete-repository --force --repository-name <name>
```

---

## 8. Quyết định kỹ thuật quan trọng

1. **State bucket**: `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (S3 tên chữ thường). Bootstrap S3/DynamoDB KHÔNG bị destroy — vẫn còn.
2. **EKS version**: 1.30 — không dùng 1.29 AMI; không nhảy 2 minor.
3. **EKS API**: public + private endpoint (demo only; `kubectl` từ laptop cần public).
4. **RDS password**: `random_password` với `override_special` — tránh `/`, `@`, `"`, space.
5. **IRSA LBC**: policy gắn trong `infra/modules/iam-irsa` — không tải IAM JSON thủ công.
6. **CI skip**: `check-aws-secrets` job output → `build-push` có `if: available == 'true'`.
7. **Grafana 13 memory**: cần ≥ 512Mi limit — 256Mi gây OOMKill.
8. **Grafana 13 auth**: `/api/login` removed — dùng service account token hoặc `auth_token` URL param.
9. **Ephemeral cost model** — destroy khi idle; không tối ưu HA/multi-AZ.
10. **AWS account**: `962765735385`, region: `ap-southeast-1`, GitHub org: `VoAnhKiet1410`.

---

*Handoff: factual, có evidence, resume từ §7. Cập nhật sau mỗi milestone.*
