# Handoff — Mini E-commerce DevOps Platform

| Field | Value |
|-------|--------|
| **Cập nhật** | 2026-06-03 (Phase 0 verified) |
| **Branch** | `main` |
| **Remote** | `https://github.com/VoAnhKiet1410/mini-ecommerce-devops.git` |
| **Unpushed commits** | 2 (`61ac2bb`, `9f5c11b`) — Phase 2 CI |
| **Working tree** | 8 file modified + untracked (xem §3) |
| **AWS runtime** | **Trống** — đã `terraform destroy` + xóa bootstrap S3/DynamoDB |
| **Spec / Plan** | `docs/superpowers/specs/2026-06-01-mini-ecommerce-devops-platform-spec.md`, `docs/superpowers/plans/2026-06-01-mini-ecommerce-devops-platform.md` |
| **Chat gần nhất** | [Phase 1 AWS + destroy](f845b16c-bfec-4f3c-977a-dae3998b07db) |

**Resume nhanh:** Phase 0 xong → commit §3 nếu đồng ý → `git push` → bootstrap + `terraform apply` khi cần AWS → Task 1.10 (Helm LBC) → Phase 3 GitOps (Kustomize).

---

## 1. Mục tiêu dự án

Xây **nền tảng DevOps portfolio** quanh [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (Online Boutique), phạm vi **happy-path**: `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice` (+ Redis, dependency tối thiểu như `currencyservice` cho Compose).

Chứng minh được:

- Local: Docker Compose + PostgreSQL platform DB  
- AWS ephemeral (`ap-southeast-1`): EKS, ECR, RDS, ALB — **bật khi demo, destroy khi rảnh**  
- IaC Terraform trong repo app  
- CI/CD GitHub Actions (OIDC → ECR, plan trên PR, Trivy/Checkov)  
- GitOps (repo thứ 2): Kustomize + Argo CD + ESO (chưa làm)  
- Observability: Prometheus/Grafana/CloudWatch (chưa làm)  

Đối tượng: solo builder, portfolio/CV tiếng Anh; **không** mục tiêu production 24/7.

---

## 2. Kiến trúc đã chốt

| Chủ đề | Quyết định |
|--------|------------|
| **Approach** | **A — Platform shell:** app giữ upstream (Redis cart, catalog in-memory); RDS/Compose Postgres là **platform DB** (Phase 1). |
| **Repo** | **2 repo public:** `VoAnhKiet1410/mini-ecommerce-devops` (app + `infra/`), `VoAnhKiet1410/mini-ecommerce-gitops` (Kustomize). |
| **Region** | `ap-southeast-1` |
| **Môi trường AWS** | Một env `prod-like` (`infra/environments/aws`), teardown thường xuyên |
| **EKS** | 1× Managed Node Group, On-Demand `t3.small`, cluster `mini-ecommerce-devops` |
| **Secrets** | AWS Secrets Manager + ESO (sync sau khi có cluster); local `.env` |
| **CI → AWS** | GitHub OIDC; **không** `terraform apply` từ CI |
| **DNS/TLS** | Phase 1: chỉ hostname ALB; Route 53/ACM deferred |
| **Diagram** | `docs/architecture.md` (Mermaid system context + bảng services) |

---

## 3. Những file đã tạo/sửa

### Đã commit trên `main` (11 commits)

| Vùng | Đường dẫn chính |
|------|------------------|
| Foundation | `.gitignore`, `README.md`, `docker-compose.yml`, `.env.example`, `src/**`, `scripts/smoke-local.sh`, `scripts/verify-platform-db.sh` |
| Docs | `docs/architecture.md`, `docs/runbooks/aws-up.md`, `aws-down.md`, `demo-checklist.md`, `github-actions-setup.md` |
| Terraform | `infra/bootstrap/state/`, `infra/modules/{vpc,eks,ecr,rds,iam-github-oidc,iam-irsa,secrets}/`, `infra/environments/aws/` |
| CI | `.github/workflows/ci-build-push.yml`, `terraform-plan.yml`, `security-scan.yml`, `.checkov.yml` |
| Helper | `scripts/push-to-github.ps1` |
| Superpowers | `docs/superpowers/specs/...`, `docs/superpowers/plans/...` (untracked trong git status ban đầu — nên `git add` khi commit) |

### Chưa commit (working tree — **ưu tiên commit trước lần apply AWS tiếp theo**)

| File | Thay đổi |
|------|----------|
| `infra/modules/eks/main.tf` | `cluster_endpoint_public_access/private_access = true` (fix `kubectl` timeout từ laptop) |
| `infra/modules/eks/variables.tf`, `infra/environments/aws/variables.tf` | EKS default **1.29 → 1.30** |
| `infra/modules/rds/main.tf` | `override_special` cho `random_password`; `backup_retention_period = 1` hardcode |
| `infra/modules/rds/variables.tf` | Xóa biến `backup_retention_period` |
| `docs/runbooks/aws-up.md` | Task 1.10: IRSA qua Terraform, script PowerShell, `ROLE_ARN` từ output |
| `scripts/install-aws-lbc.ps1` | **Mới** — Helm install AWS LBC + `kubectl wait` |
| `scripts/push-to-github.ps1` | Dùng `gh auth setup-git` thay token trong URL |
| `.env.example` | Bỏ comment section (cosmetic) |

### Repo GitOps (`d:\mini-ecommerce-gitops`)

- Chỉ commit `chore: initialize GitOps repository placeholder` — **chưa** Kustomize/Argo/ESO.

### File local không commit (`.gitignore`)

- `infra/bootstrap/state/terraform.tfvars`
- `infra/environments/aws/terraform.tfvars`, `backend.hcl`

---

## 4. Task đã hoàn thành

### Phase 0 — Foundation (100%)

| Task | Trạng thái |
|------|------------|
| 0.1 Skeleton repo | ✅ |
| 0.2 Vendor `src/` happy-path + protos + `currencyservice` | ✅ |
| 0.3 `docker-compose.yml`, scripts, `.env.example` | ✅ |
| 0.3 Verify local (Compose + smoke + platform DB) | ✅ 2026-06-03 — HTTP 200, `SELECT 1` OK |
| 0.4 `docs/architecture.md` đầy đủ | ✅ |
| 0.4 Push GitHub app repo | ✅ `VoAnhKiet1410/mini-ecommerce-devops` |
| 0.4 GitOps repo placeholder | ✅ `VoAnhKiet1410/mini-ecommerce-gitops` (Kustomize = Phase 3) |

### Phase 1 — AWS core (code ~100%, runtime đã teardown)

| Task | Trạng thái |
|------|------------|
| 1.1–1.8 Terraform modules + root `environments/aws` | ✅ |
| 1.9 Runbooks `aws-up` / `aws-down` / `demo-checklist` | ✅ |
| Hardening (OIDC conditional, S3 policy, RDS encrypt, ECR lifecycle, lock files) | ✅ commit `5c15567` |
| `terraform apply` (bootstrap + env) | ✅ đã chạy trong session trước |
| `terraform destroy` env + bootstrap S3/DynamoDB | ✅ AWS account **sạch** |
| **1.10** LBC Helm trên cluster | ⚠️ **Script + runbook** chuẩn bị xong; **chưa** chạy Helm (không có cluster) |

### Phase 2 — CI/CD (~90% code)

| Task | Trạng thái |
|------|------------|
| 2.1 `ci-build-push.yml` (ECR OIDC + Trivy SARIF) | ✅ committed; **chưa push** 2 commit lên GitHub |
| 2.2 `terraform-plan.yml`, `security-scan.yml`, `.checkov.yml` | ✅ |
| `docs/runbooks/github-actions-setup.md` | ✅ |
| E2E: workflow green + image trên ECR | ❌ Cần AWS stack + GitHub secrets |

### Phase 3–5

Chưa bắt đầu (GitOps, observability, optional hardening).

---

## 5. Task đang làm dở

1. **Task 1.10 — AWS Load Balancer Controller**
   - Đã có: `scripts/install-aws-lbc.ps1`, cập nhật `docs/runbooks/aws-up.md` (uncommitted).
   - Cần: `terraform apply` lại stack → chạy script → verify pods `Running` → commit.

2. **Đồng bộ repo với bài học từ `terraform apply` thực tế**
   - EKS 1.30, public API endpoint, RDS `override_special` — **đang unstaged**, chưa trên `origin/main`.

3. **Phase 2 E2E**
   - Push `61ac2bb`, `9f5c11b` lên GitHub.
   - Cấu hình secrets (`AWS_ECR_ROLE_ARN`, …) sau khi apply Terraform.
   - Chạy workflow build ECR.

4. **User yêu cầu Task 1.10** trong chat [f845b16c](f845b16c-bfec-4f3c-977a-dae3998b07db) — transcript kết thúc trước khi chạy Helm (AWS đã destroy).

---

## 6. Lỗi hiện tại (nếu có)

| Vấn đề | Trạng thái / cách xử lý |
|--------|-------------------------|
| **Không có cluster AWS** | Đã destroy — Task 1.10 **blocked** cho đến khi apply lại. |
| **`kubectl` timeout `10.0.x.x:443`** | Đã diagnose: API server private-only; fix trong unstaged `cluster_endpoint_public_access = true`. |
| **RDS password invalid chars** | Lần apply 1 fail; fix `override_special` (unstaged, chưa commit). |
| **EKS 1.29 AMI unsupported** | Đã nâng 1.30 khi apply; default trong **commit** vẫn 1.29 — cần commit unstaged. |
| **Bootstrap S3/DynamoDB** | Đã xóa — lần deploy sau **bắt buộc** bootstrap lại. |
| **2 commit chưa push** | `origin/main` thiếu Phase 2 workflows + fix CI context. |
| **CI E2E chưa verify** | `gh run list` trong session handoff không trả run — có thể chưa push hoặc chưa auth. |

**Không có lỗi blocker trong code local** nếu chỉ làm Compose; blocker cho cloud path là **không có AWS resources**.

---

## 7. Lệnh đã chạy và kết quả

| Lệnh | Kết quả |
|------|---------|
| `terraform validate` (9 path: bootstrap, 7 modules, env) | **Pass** (session Phase 1) |
| `terraform plan` bootstrap | **Pass** — Plan: 5 to add |
| `terraform apply` `infra/bootstrap/state` | **Pass** — 7 resources; bucket `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (đã xóa sau) |
| `terraform apply` `infra/environments/aws` | **Pass** sau fix RDS password + EKS **1.30** (~82 resources) |
| `aws eks update-kubeconfig` + `kubectl get nodes` | **Fail/timeout** — private endpoint (trước khi bật public access trong TF) |
| `terraform destroy` `environments/aws` | **Pass** — 82 resources destroyed |
| `aws s3` xóa versioned state + `terraform destroy` bootstrap | **Pass** — bucket + DynamoDB lock gone |
| AWS audit (EKS, RDS, VPC, ECR, S3, DynamoDB, IAM, secrets) | **Pass** — không còn tài nguyên project |
| `git log` | 11 commits local; **ahead origin by 2** |
| `gh run list` (handoff session) | Không có output (chưa xác nhận CI trên remote) |

---

## 8. Test đã pass/fail

| Kiểm tra | Kết quả | Ghi chú |
|----------|---------|---------|
| `terraform validate` (toàn bộ `infra/`) | **Pass** | Đã chạy có log trong session Phase 1 |
| `terraform fmt` | **Pass** (đã auto-fix một lần) | |
| `terraform plan` env với backend live | **Pass** | Khi bucket còn tồn tại |
| `terraform apply` / `destroy` | **Pass** | Một vòng apply + destroy đầy đủ |
| `checkov` local | **Không chạy** | Dùng trong GitHub Actions |
| `docker compose` / `scripts/smoke-local.sh` | **Pass** | HTTP 200 tại `:8080` (2026-06-03) |
| `scripts/verify-platform-db.sh` / `.ps1` | **Pass** | `SELECT 1` qua `docker compose exec postgres` |
| GitHub Actions CI/Terraform plan | **Chưa verify E2E** | Workflows committed; AWS + secrets + push cần thiết |
| Helm LBC / `kubectl wait` (Task 1.10) | **Chưa chạy** | Không cluster |
| Unit tests trong `src/` | **Không chạy** | Không phải focus Phase 1 |

---

## 9. Quyết định kỹ thuật quan trọng

1. **Approach A** — không fork catalog sang Postgres trong Phase 1.  
2. **Account AWS** `962765735385`, CLI profile `default`, GitHub `VoAnhKiet1410`.  
3. **State bucket** (khi bootstrap lại): `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (S3 tên chữ thường).  
4. **EKS version** thực tế đã chạy: **1.30** (không dùng 1.29 AMI; không nhảy 2 minor một lần).  
5. **EKS API:** bật **public + private** endpoint để `kubectl` từ laptop (demo only).  
6. **RDS password:** `random_password` với `override_special` — tránh `/ @ " space`.  
7. **IRSA LBC:** policy gắn trong `infra/modules/iam-irsa` (`attach_load_balancer_controller_policy = true`) — **không** tải IAM JSON thủ công.  
8. **CI:** `terraform-plan.yml` dùng `github.repository_owner` / context — **không** biến `GITHUB_*` trong Actions vars.  
9. **Destroy policy:** User đã destroy **cả env lẫn bootstrap** — chi phí AWS ≈ 0; deploy lại = bootstrap từ đầu.  
10. **Ephemeral cost model** — giữ destroy khi idle; không tối ưu HA/multi-AZ.

---

## 10. Việc tiếp theo nên làm

**Thứ tự đề xuất:**

1. **Commit** thay đổi unstaged (EKS 1.30 + public endpoint, RDS password, Task 1.10 script/runbook, `push-to-github.ps1`) + `git add docs/superpowers/`.  
2. **`git push origin main`** — đưa Phase 2 CI lên GitHub.  
3. Khi cần demo AWS:
   - `cd infra/bootstrap/state && terraform apply`
   - `cd infra/environments/aws && terraform init -backend-config=backend.hcl && terraform apply`
   - Cấu hình GitHub secrets theo `docs/runbooks/github-actions-setup.md`
   - `.\scripts\install-aws-lbc.ps1` (Task 1.10)
   - Helm: ESO, Argo CD (`docs/runbooks/aws-up.md` §4–5)
4. **Phase 3:** Kustomize base/overlays trong `mini-ecommerce-gitops`, Argo Application, ESO `ClusterSecretStore`.  
5. **Phase 4:** Observability sau khi app chạy trên EKS.  
6. **`terraform destroy`** khi xong demo.

**Skill Superpowers gợi ý:** `executing-plans` hoặc `subagent-driven-development` cho Phase 3; `verification-before-completion` trước khi báo xong Task 1.10/CI.

---

## 11. Những điều không được tự ý thay đổi

- **Phạm vi happy-path** — không deploy full microservices-demo (payment, shipping, email, …) trừ khi plan/spec cập nhật.  
- **Hai repo** — app + GitOps tách; không gộp manifest vào app repo.  
- **Region** `ap-southeast-1` và tên cluster/project `mini-ecommerce-devops` (trừ khi user đổi có chủ đích).  
- **Approach A** — không migrate app sang RDS trong Phase 1.  
- **Không commit** `.env`, `terraform.tfvars`, `backend.hcl`, state files, secrets.  
- **Không `terraform apply` từ CI** — chỉ plan trên PR.  
- **Không hard-code AWS keys** — chỉ OIDC/IRSA.  
- **Không force-push `main`**; không amend commit đã push.  
- **Không tự commit/push** trừ khi user yêu cầu (user rule).  
- **Placeholder đã thay thật** — không đổi lại `VoAnhKiet1410` / `962765735385` / bucket name đã thống nhất.  
- **Public repo** — giữ public cho portfolio.  
- **Docs/CV tiếng Anh** cho README/runbook recruiter-facing; handoff nội bộ có thể tiếng Việt.

---

*Handoff theo Superpowers: factual, có evidence, resume từ §10. Cập nhật file này sau mỗi milestone (apply AWS, 1.10 pass, Phase 3 sync, CI green).*
