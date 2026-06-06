# CLAUDE.md — Mini E-commerce DevOps Platform

> Context file cho Claude Code. Đọc file này trước khi làm bất kỳ task nào trong repo.

---

## Project Overview

### Purpose

Portfolio DevOps project của **VoAnhKiet1410** nhằm chứng minh năng lực cho vị trí Cloud/DevOps Intern. Project bọc quanh [Google microservices-demo (Online Boutique)](https://github.com/GoogleCloudPlatform/microservices-demo), chỉ chạy **happy-path services** (không phải toàn bộ demo), và xây dựng toàn bộ nền tảng DevOps bên trên:

- Local: Docker Compose + PostgreSQL platform DB
- AWS ephemeral (`ap-southeast-1`): EKS, ECR, RDS, ALB — bật khi demo, `terraform destroy` khi xong
- IaC: Terraform (`infra/` trong app repo)
- CI/CD: GitHub Actions + OIDC → ECR; Terraform plan trên PR
- GitOps: Argo CD + Kustomize (repo riêng: `VoAnhKiet1410/mini-ecommerce-gitops`)
- Observability: Prometheus, Grafana, CloudWatch
- Security: Trivy (image scan), Checkov (Terraform), AWS Secrets Manager + External Secrets Operator

**Mục tiêu:** CV/portfolio recruiter-facing, không phải production 24/7.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Languages | Go (frontend, productcatalog, checkout, shipping), C# .NET (cartservice), Node.js (currency, payment, email), Python (emailservice) |
| Communication | gRPC (protobuf) giữa các services |
| Frontend | Go HTTP server (gorilla/mux), HTML templates |
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes (EKS 1.30), Argo CD (GitOps) |
| IaC | Terraform >= 1.5 |
| Cloud | AWS ap-southeast-1: EKS, ECR, RDS PostgreSQL 16, ALB, Secrets Manager, CloudWatch |
| CI/CD | GitHub Actions (OIDC), Docker Buildx |
| Security scanning | Trivy (images + fs), Checkov (Terraform/K8s) |
| Observability | kube-prometheus-stack (Prometheus + Grafana), CloudWatch alarms |
| Secrets | AWS Secrets Manager + External Secrets Operator (EKS); `.env` local |
| Manifest format | Kustomize (base + overlays/aws) — ở repo `mini-ecommerce-gitops` |

---

## Repository Structure

```
.
├── .github/workflows/
│   ├── ci-build-push.yml       # Build 4 happy-path images → ECR; Trivy gate (CRITICAL fail)
│   ├── terraform-plan.yml      # Triggered on PR touching infra/**; plan + Checkov + PR comment
│   └── security-scan.yml       # Checkov + Trivy fs; scheduled Mondays 06:00 UTC
├── .checkov.yml                # Checkov config (terraform + kubernetes frameworks)
├── .env.example                # Template biến môi trường local (copy → .env, không commit .env)
├── docker-compose.yml          # Local stack: postgres, redis, 7 happy-path services, frontend
├── src/
│   ├── frontend/               # Go HTTP server — web UI, gọi tất cả backend qua gRPC
│   ├── productcatalogservice/  # Go gRPC — catalog in-memory từ products.json
│   ├── cartservice/            # C# .NET gRPC — lưu cart trên Redis
│   ├── checkoutservice/        # Go gRPC — orchestrate order: cart→payment→shipping→email
│   ├── currencyservice/        # Node.js gRPC — convert tiền tệ
│   ├── paymentservice/         # Node.js gRPC — charge thẻ (mock)
│   ├── emailservice/           # Python gRPC — gửi email xác nhận (mock)
│   ├── shippingservice/        # Go gRPC — tính phí ship
│   └── protos/                 # Shared proto definitions
├── infra/
│   ├── bootstrap/state/        # Terraform cho S3 bucket + DynamoDB lock (chạy trước env)
│   ├── environments/aws/       # Root module cho AWS stack (VPC, EKS, ECR, RDS, IAM, secrets, CloudWatch)
│   └── modules/
│       ├── ecr/                # ECR repos với lifecycle policy
│       ├── eks/                # EKS cluster + managed node group
│       ├── iam-github-oidc/    # OIDC provider + IAM roles cho GitHub Actions
│       ├── iam-irsa/           # IRSA roles cho LBC + ESO
│       ├── observability-cloudwatch/ # CloudWatch alarms: RDS CPU/storage, ALB 5xx
│       ├── rds/                # RDS PostgreSQL 16
│       ├── secrets/            # AWS Secrets Manager (RDS credentials)
│       └── vpc/                # VPC + subnets
├── observability/
│   └── aws/
│       ├── dashboards/cluster-overview.json  # Grafana dashboard JSON
│       └── helm-values/kube-prometheus-stack.yaml
├── scripts/                    # Helper scripts (.sh + .ps1 pairs cho mọi lệnh)
│   ├── smoke-local.*           # Kiểm tra local Compose hoạt động
│   ├── verify-platform-db.*    # Kiểm tra PostgreSQL qua docker compose
│   ├── install-aws-lbc.*       # Helm install AWS Load Balancer Controller
│   ├── install-eso.*           # Helm install External Secrets Operator
│   ├── install-argocd.*        # Helm install + configure Argo CD
│   ├── install-monitoring.*    # Helm install kube-prometheus-stack
│   ├── smoke-aws.*             # HTTP smoke test với ALB hostname
│   ├── verify-phase3.*         # Verify GitOps + ALB
│   ├── verify-phase4.*         # Verify CloudWatch alarms + monitoring
│   └── run-phase4-e2e.*        # Full E2E Phase 4 (apply infra + verify)
└── docs/
    ├── architecture.md         # Mermaid system diagram + bảng services
    ├── runbooks/
    │   ├── aws-up.md           # Hướng dẫn bật AWS stack (8 bước)
    │   ├── aws-down.md         # Teardown an toàn
    │   ├── observability.md    # Prometheus/Grafana/CloudWatch setup
    │   ├── github-actions-setup.md  # GitHub secrets + OIDC trust
    │   └── demo-checklist.md   # Script demo cho recruiter
    └── superpowers/
        ├── specs/              # Project spec đầy đủ
        ├── plans/              # Implementation plan theo phase
        └── handoff/current-state.md  # Trạng thái session gần nhất
```

---

## Architecture

### System Context

```
Developer Workstation
  ├── Docker Compose (local dev)
  ├── Terraform CLI (apply/destroy manual)
  └── kubectl / argocd CLI

GitHub
  ├── App Repo: VoAnhKiet1410/mini-ecommerce-devops (source + infra/)
  ├── GitOps Repo: VoAnhKiet1410/mini-ecommerce-gitops (Kustomize)
  └── GitHub Actions
        ├── ci-build-push.yml → push images to ECR (OIDC)
        ├── terraform-plan.yml → plan on PR (OIDC read-only)
        └── security-scan.yml → Checkov + Trivy fs

AWS ap-southeast-1
  ├── ECR (mini-ecommerce/<service>)
  ├── EKS cluster: mini-ecommerce-devops (1.30, m7i-flex.large)
  │     ├── Happy-path pods (frontend, productcatalog, cart, checkout)
  │     ├── Redis (in-cluster Deployment)
  │     ├── Argo CD (GitOps sync)
  │     ├── AWS Load Balancer Controller (ALB)
  │     ├── External Secrets Operator (→ Secrets Manager)
  │     ├── Prometheus + Grafana (kube-prometheus-stack)
  │     └── Application Load Balancer (public ingress)
  ├── RDS PostgreSQL (platform DB, không dùng bởi app Phase 1)
  ├── AWS Secrets Manager (RDS credentials)
  └── CloudWatch (alarms: RDS CPU/storage, ALB 5xx)
```

### Two-Repository GitOps Model

| Repo | Nội dung |
|------|---------|
| `mini-ecommerce-devops` (repo này) | `src/`, `infra/`, `docker-compose.yml`, CI workflows, runbooks |
| `mini-ecommerce-gitops` | Kustomize `base/` + `overlays/aws/`, Argo CD Applications |

CI builds images từ `src/` → ECR; GitOps manifests reference ECR tags; Argo CD syncs overlay `aws`.

### Happy-Path Services Only

Phase 1 deploy scope: `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice`.
Compose local cũng chạy: `currencyservice`, `shippingservice`, `paymentservice`, `emailservice` (để browse/cart/checkout hoạt động đầy đủ).
Không deploy: `adservice`, `recommendationservice`, `loadgenerator`, v.v.

---

## Key Modules

### Application Services

| Service | Language | Port | Storage | CI image |
|---------|----------|------|---------|---------|
| `frontend` | Go | 8080 (HTTP) | — (gọi backends) | ✅ ECR |
| `productcatalogservice` | Go | 3550 (gRPC) | In-memory `products.json` | ✅ ECR |
| `cartservice` | C# .NET | 7070 (gRPC) | **Redis** | ✅ ECR |
| `checkoutservice` | Go | 5050 (gRPC) | — (orchestrator) | ✅ ECR |
| `currencyservice` | Node.js | 7000 (gRPC) | currency_conversion.json | ❌ (compose only) |
| `paymentservice` | Node.js | 50051 (gRPC) | — | ❌ (compose only) |
| `emailservice` | Python | 8080 (gRPC) | — | ❌ (compose only) |
| `shippingservice` | Go | 50051 (gRPC) | — | ❌ (compose only) |

### Infrastructure Modules (`infra/modules/`)

| Module | Tạo ra |
|--------|--------|
| `ecr` | ECR repos `mini-ecommerce/<service>` + lifecycle policy 7 ngày cho untagged |
| `eks` | EKS cluster 1.30, managed node group `m7i-flex.large` |
| `iam-github-oidc` | GitHub OIDC provider + 2 IAM roles (ECR push, Terraform plan) |
| `iam-irsa` | IRSA roles cho AWS LBC và External Secrets Operator |
| `rds` | RDS PostgreSQL 16, private subnets, encrypted |
| `secrets` | Secrets Manager secret với RDS credentials |
| `observability-cloudwatch` | CloudWatch alarms: RDS CPU, RDS storage, ALB 5xx |
| `vpc` | VPC + public/private subnets |

---

## Development Commands

### Local Development

```bash
# Setup lần đầu
cp .env.example .env
docker compose up --build -d

# Verify hoạt động
./scripts/smoke-local.sh          # Linux/Mac
.\scripts\smoke-local.ps1         # Windows PowerShell

# Verify PostgreSQL platform DB
./scripts/verify-platform-db.sh
.\scripts\verify-platform-db.ps1

# Xem logs
docker compose logs -f frontend
docker compose logs -f cartservice

# Tắt
docker compose down
```

**Frontend:** http://localhost:8080

### Infrastructure (Terraform)

```bash
# Lần đầu — bootstrap remote state
cd infra/bootstrap/state
cp terraform.tfvars.example terraform.tfvars   # điền bucket name, region
terraform init
terraform apply

# Apply AWS stack
cd infra/environments/aws
cp terraform.tfvars.example terraform.tfvars   # điền github_org, v.v.
cp backend.hcl.example backend.hcl             # điền bucket name
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan

# Teardown (QUAN TRỌNG: chạy khi xong demo)
terraform destroy
```

### AWS Stack Bring-up (theo thứ tự)

```powershell
# 1. Apply Terraform (xem trên)
# 2. Configure kubectl
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops

# 3. Install AWS Load Balancer Controller
.\scripts\install-aws-lbc.ps1

# 4. Install External Secrets Operator
.\scripts\install-eso.ps1

# 5. Install Argo CD + sync GitOps
.\scripts\install-argocd.ps1

# 6. Verify Phase 3
.\scripts\verify-phase3.ps1

# 7. Install Prometheus + Grafana
$env:GRAFANA_ADMIN_PASSWORD = "your-lab-password"
.\scripts\install-monitoring.ps1

# 8. Verify Phase 4
.\scripts\verify-phase4.ps1
```

### CI/CD

- **CI build/push:** tự động khi push `src/**` lên `main` → build 4 happy-path images → ECR
- **Terraform plan:** tự động khi mở PR touching `infra/**` → plan + Checkov + comment trên PR
- **Security scan:** scheduled Mondays 06:00 UTC + PR → Checkov + Trivy fs

### Agent Skills Setup

```bash
./scripts/setup-agent-skills.sh    # Linux/Mac
.\scripts\setup-agent-skills.ps1   # Windows
```

### Terraform Format Check

```bash
cd infra
terraform fmt -recursive
terraform fmt -check -recursive    # chỉ check, không sửa
```

---

## Environment Variables

### Local (`.env` — copy từ `.env.example`, không commit)

| Variable | Mặc định | Mô tả |
|----------|----------|-------|
| `FRONTEND_PORT` | `8080` | Port expose frontend ra host |
| `PRODUCT_CATALOG_SERVICE_ADDR` | `productcatalogservice:3550` | gRPC addr productcatalog |
| `CART_SERVICE_ADDR` | `cartservice:7070` | gRPC addr cartservice |
| `CHECKOUT_SERVICE_ADDR` | `checkoutservice:5050` | gRPC addr checkoutservice |
| `CURRENCY_SERVICE_ADDR` | `currencyservice:7000` | gRPC addr currency |
| `RECOMMENDATION_SERVICE_ADDR` | `recommendationservice:8080` | gRPC addr (chưa deploy) |
| `SHIPPING_SERVICE_ADDR` | `shippingservice:50051` | gRPC addr shipping |
| `AD_SERVICE_ADDR` | `adservice:9555` | gRPC addr (chưa deploy) |
| `SHOPPING_ASSISTANT_SERVICE_ADDR` | `shoppingassistantservice:80` | gRPC addr (chưa deploy) |
| `REDIS_ADDR` | `redis:6379` | Redis cho cartservice |
| `POSTGRES_HOST` | `localhost` | Platform DB host |
| `POSTGRES_PORT` | `5432` | Platform DB port |
| `POSTGRES_DB` | `platform` | Database name |
| `POSTGRES_USER` | `platform` | DB user |
| `POSTGRES_PASSWORD` | `change-me-local-only` | DB password (KHÔNG commit giá trị thật) |
| `GRAFANA_ADMIN_PASSWORD` | — | Grafana admin (chỉ dùng khi install-monitoring, không commit) |

### GitHub Actions Secrets (cấu hình sau `terraform apply`)

| Secret | Nguồn |
|--------|-------|
| `AWS_ECR_ROLE_ARN` | `terraform output -raw github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | `terraform output -raw github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | S3 bucket từ `infra/bootstrap/state` (khớp `backend.hcl`) |

### Terraform Variables (không commit các file này)

| File | Mô tả |
|------|-------|
| `infra/bootstrap/state/terraform.tfvars` | S3 bucket name, region |
| `infra/environments/aws/terraform.tfvars` | `github_org`, `github_repo`, `aws_region`, v.v. |
| `infra/environments/aws/backend.hcl` | S3 backend config |

---

## Coding Conventions

### Terraform

- Format chuẩn `terraform fmt -recursive` trước khi commit
- Module inputs/outputs khai báo đầy đủ trong `variables.tf` / `outputs.tf`
- Tags đồng nhất: `Project`, `Environment`, `ManagedBy = "terraform"`
- Không hard-code AWS account ID hoặc credentials
- Baseline Checkov: `infra/.checkov.baseline` (các check đã suppress có lý do)

### Go Services

- JSON logging với `logrus` (fields: `timestamp`, `severity`, `message`)
- gRPC client connections qua `mustConnGRPC()` — panic nếu không kết nối được
- Environment variables đọc qua `mustMapEnv()` — panic nếu thiếu biến bắt buộc
- OTel tracing tùy chọn qua `ENABLE_TRACING=1`

### Docker / Docker Compose

- Mỗi service có `Dockerfile` riêng trong thư mục service
- Multi-stage build: builder → distroless hoặc alpine minimal
- `depends_on` dùng `condition: service_healthy` cho postgres/redis
- Service names trong Compose là DNS names nội bộ

### Scripts

- Mọi script đều có cặp `.sh` (Linux/Mac) và `.ps1` (Windows PowerShell)
- Script thường idempotent: skip nếu resource đã tồn tại / pod đã Running

### Git / Commits

- Commit message theo Conventional Commits: `feat:`, `fix:`, `ci:`, `docs:`, `chore:`
- Không commit: `.env`, `terraform.tfvars`, `backend.hcl`, `*.tfstate`, `tfplan` binary, secrets
- Không force-push `main`; không amend commit đã push

---

## Important Workflows

### 1. Local Development Flow

```
cp .env.example .env
→ docker compose up --build -d
→ scripts/smoke-local (HTTP 200 port 8080)
→ scripts/verify-platform-db (SELECT 1 qua compose exec postgres)
→ Mở http://localhost:8080
```

### 2. CI/CD Flow (GitHub Actions)

```
push src/** → main
→ ci-build-push.yml (matrix: 4 services)
  → OIDC assume ECR push role
  → docker build + push → ECR (sha + latest tags)
  → Trivy gate: fail on CRITICAL
  → Trivy SARIF: upload HIGH+CRITICAL artifacts
```

### 3. Infrastructure Change Flow

```
PR touching infra/**
→ terraform-plan.yml
  → OIDC assume plan role (read-only)
  → terraform fmt -check → validate → plan
  → Checkov (baseline)
  → sticky comment trên PR với plan output

→ Review + approve
→ Merge
→ Manual: terraform apply tfplan (local, không CI)
```

### 4. AWS Deploy Flow (theo thứ tự)

```
bootstrap state → terraform apply env
→ aws eks update-kubeconfig
→ install-aws-lbc (Helm LBC)
→ install-eso (Helm External Secrets)
→ install-argocd (Helm + apply manifests từ mini-ecommerce-gitops)
  → ESO ClusterSecretStore → Secrets Manager
  → Argo sync → boutique namespace
→ CI push images → ECR (cần push src/ change hoặc workflow_dispatch)
→ smoke-aws (ALB hostname HTTP 200)
→ install-monitoring (Grafana + Prometheus)
→ verify-phase4 (CloudWatch alarms)
→ DEMO
→ terraform destroy (QUAN TRỌNG)
```

### 5. Secret Flow (EKS)

```
RDS credentials → AWS Secrets Manager
→ External Secrets Operator (ClusterSecretStore)
→ ExternalSecret CR (boutique namespace)
→ K8s Secret (mounted vào pods nếu cần)
```

---

## Safety Rules for Claude

1. **Không tự ý đổi kiến trúc lớn** — Approach A (platform shell), 2-repo model, region `ap-southeast-1`, tên cluster `mini-ecommerce-devops` là cố định. Chỉ thay đổi khi user yêu cầu rõ ràng.

2. **Không thêm services ngoài happy-path** vào CI/EKS mà không có spec cập nhật. Happy-path = `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice`.

3. **Không commit / push / deploy** trừ khi user yêu cầu rõ ràng. Đây là rule cứng.

4. **Không `terraform apply` từ CI** — chỉ plan trên PR. Apply luôn chạy manual local.

5. **Không hard-code secrets** — không bao giờ ghi AWS keys, passwords thật vào code/config. Chỉ dùng OIDC/IRSA và `.env` local (gitignored).

6. **Không xóa code khi chưa chắc** — nếu không rõ một đoạn code có dùng không, hỏi trước.

7. **Không thay đổi public API** (gRPC proto, HTTP routes) nếu chưa được yêu cầu.

8. **Khi sửa Terraform:** chạy `terraform fmt -check` và `terraform validate` trước khi commit. Checkov chạy trong CI.

9. **Khi sửa code:** nêu rõ file nào bị ảnh hưởng, service nào cần rebuild.

10. **AWS là ephemeral và tốn tiền** — không tự ý chạy `terraform apply` hay bật AWS resources. Nhắc user `terraform destroy` sau demo.

11. **Không migrate app sang RDS trong Phase 1** — RDS là platform DB, app dùng Redis/in-memory theo upstream.

12. **Không merge manifest repo vào app repo** — giữ 2 repo tách biệt.

13. **Không commit** các file: `.env`, `terraform.tfvars`, `backend.hcl`, `*.tfstate`, `tfplan` (binary), `terraform.tfvars.example` chứa giá trị thật.

14. **Docs/README recruiter-facing viết bằng tiếng Anh**. Handoff nội bộ có thể tiếng Việt. Reply tiếng Việt khi user hỏi tiếng Việt.

---

## Known Issues / Needs Verification

| Vấn đề | Trạng thái |
|--------|-----------|
| **Phase 4 E2E chưa chạy trên AWS** | Code đã commit (`5dc7c74`). Cần `run-phase4-e2e.ps1 -ApplyInfra` khi sẵn sàng chi phí. |
| **CI E2E chưa verify đầy đủ** | Workflows committed; cần AWS stack + GitHub secrets + push để verify green run. |
| **EKS 1.30 + public endpoint** | Có thể còn uncommitted changes trong `infra/modules/eks/` — xem `git status` trước khi apply. |
| **Bootstrap state đã destroy** | Lần deploy tiếp theo phải chạy `terraform apply` bootstrap lại trước. |
| **RDS `override_special`** | Fix RDS password special chars — kiểm tra đã commit chưa với `git status`. |
| **`frontend` kết nối `recommendationservice` + `adservice`** | `mustConnGRPC` sẽ panic nếu không có addr. Trong Compose, 2 service này không chạy → `docker compose` có thể fail nếu addr required. Cần kiểm tra. |
| **Unit tests** | Hầu hết services không có tests được chạy trong CI (chỉ Go services có `*_test.go`). Không phải focus Phase 1. |
| **Grafana screenshot** | `capture-grafana-screenshot.ps1` cần Playwright (npx). Chưa chạy trên AWS. |

---

## Quick Start for Future Claude Sessions

### Bước 1 — Đọc context

1. Đọc file này (`CLAUDE.md`) — xong rồi.
2. Đọc [`docs/superpowers/handoff/current-state.md`](docs/superpowers/handoff/current-state.md) — trạng thái phase gần nhất, commits chưa push, lỗi hiện tại.
3. Chạy `git status` + `git log --oneline -10` để biết working tree.

### Bước 2 — Xác định task thuộc vùng nào

| Task thuộc về | File/folder cần đọc thêm |
|--------------|--------------------------|
| Local Compose | `docker-compose.yml`, `.env.example`, `scripts/smoke-local.*` |
| Terraform infra | `infra/environments/aws/`, `infra/modules/`, `docs/runbooks/aws-up.md` |
| CI/CD | `.github/workflows/`, `docs/runbooks/github-actions-setup.md` |
| GitOps / Argo CD | `docs/runbooks/aws-up.md` §5, repo `mini-ecommerce-gitops` |
| Observability | `observability/`, `docs/runbooks/observability.md`, `scripts/install-monitoring.*` |
| App services | `src/<service>/`, proto files trong `src/protos/` |

### Bước 3 — Lệnh an toàn để khám phá

```bash
git status
git log --oneline -10
docker compose config          # validate compose file
terraform validate             # trong infra/environments/aws (cần terraform init trước)
terraform fmt -check -recursive  # trong infra/
```

### Quan trọng nhất cần nhớ

- **Happy-path only:** frontend + productcatalog + cart + checkout (+ dependencies khi Compose)
- **Terraform apply = manual local**, không bao giờ từ CI
- **`terraform destroy` sau mỗi demo** — AWS tốn tiền
- **2 repo:** app (`mini-ecommerce-devops`) + GitOps (`mini-ecommerce-gitops`)
- **AWS account:** `962765735385`, GitHub org: `VoAnhKiet1410`, region: `ap-southeast-1`
- **State bucket** (khi bootstrap lại): `voanhkiet1410-mini-ecommerce-tfstate-962765735385`
