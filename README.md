# Mini E-commerce DevOps Platform

> **Portfolio DevOps project** by [VoAnhKiet1410](https://github.com/VoAnhKiet1410) — demonstrating Cloud/DevOps engineering skills on a real microservices workload.

[![CI Build and Push](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/ci-build-push.yml/badge.svg)](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/ci-build-push.yml)
[![Terraform Plan](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/terraform-plan.yml/badge.svg)](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/terraform-plan.yml)
[![Security Scan](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/security-scan.yml/badge.svg)](https://github.com/VoAnhKiet1410/mini-ecommerce-devops/actions/workflows/security-scan.yml)

---

## Overview

This project wraps [Google's Online Boutique microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) with a production-grade DevOps platform built from scratch. It covers the full lifecycle: local development, cloud infrastructure, CI/CD, GitOps, supply chain security, and observability — all designed to be demonstrated to recruiters then **torn down immediately** to control costs.

**Key design decision:** the AWS stack is *ephemeral* — `terraform apply` before a demo, `terraform destroy` when done. The IaC and GitOps configuration persists in code.

### What was built (not configured)

| Layer | Built |
|-------|-------|
| IaC | Terraform modules for VPC, EKS, ECR, RDS, IAM OIDC, IRSA, Secrets Manager, CloudWatch |
| CI/CD | GitHub Actions pipelines: image build → Trivy scan → ECR push → cosign sign → SBOM attest → GitOps PR |
| GitOps | Argo CD + Kustomize two-repo model; ESO syncs RDS credentials from Secrets Manager |
| Supply chain | cosign keyless signing (Sigstore/Fulcio) + syft SPDX SBOM attestation, verified against GitHub OIDC identity |
| Observability | kube-prometheus-stack (Prometheus + Grafana) + CloudWatch alarms for RDS and ALB |
| FinOps | Infracost cost-diff sticky comment on every infrastructure PR |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  GitHub                                                           │
│  ├── mini-ecommerce-devops (this repo)                           │
│  │     src/ ──► CI build/push ──► ECR ──► cosign sign + SBOM     │
│  │     infra/ ──► Terraform plan + Checkov + Infracost on PR     │
│  └── mini-ecommerce-gitops (Kustomize manifests)                 │
│        CI opens image-bump PR ──► Merge ──► Argo CD syncs        │
└──────────────────────────────────────────────────────────────────┘
                              │
                     terraform apply
                              │
┌──────────────────────────────────────────────────────────────────┐
│  AWS ap-southeast-1                                               │
│  ├── ECR  mini-ecommerce/{frontend,productcatalog,cart,checkout} │
│  ├── EKS  mini-ecommerce-devops (1.30, m7i-flex.large)           │
│  │     ├── boutique namespace (6 pods via Argo CD)               │
│  │     ├── AWS Load Balancer Controller  →  ALB (HTTP)           │
│  │     ├── External Secrets Operator  →  Secrets Manager         │
│  │     ├── Argo CD                                               │
│  │     └── kube-prometheus-stack (Prometheus + Grafana)          │
│  ├── RDS  PostgreSQL 16 (platform DB, private subnets)           │
│  ├── Secrets Manager  mini-ecommerce-devops/rds/master           │
│  └── CloudWatch  alarms: RDS CPU/storage, ALB 5xx               │
└──────────────────────────────────────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the full Mermaid diagram.

### Two-repo GitOps model

| Repo | Contents |
|------|----------|
| `mini-ecommerce-devops` *(this repo)* | Application source, Terraform infra, CI workflows, runbooks |
| [`mini-ecommerce-gitops`](https://github.com/VoAnhKiet1410/mini-ecommerce-gitops) | Kustomize `base/` + `overlays/aws/`, Argo CD Application manifests |

CI pushes images → ECR. CI then opens an image-bump PR on the gitops repo. After human review + merge, Argo CD detects the change and syncs the cluster.

### Happy-path services

Only 4 services are built by CI and deployed to EKS:

| Service | Language | Port | Storage |
|---------|----------|------|---------|
| `frontend` | Go | 8080 (HTTP) | — |
| `productcatalogservice` | Go | 3550 (gRPC) | In-memory JSON |
| `cartservice` | C# .NET | 7070 (gRPC) | Redis |
| `checkoutservice` | Go | 5050 (gRPC) | — (orchestrator) |

`currencyservice`, `shippingservice`, `paymentservice`, `emailservice` run in Docker Compose for local development only.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Cloud | AWS (`ap-southeast-1`): EKS 1.30, ECR, RDS PostgreSQL 16, ALB, Secrets Manager, CloudWatch |
| IaC | Terraform ≥ 1.5, remote state on S3 + DynamoDB lock |
| Containers | Docker, Docker Compose, multi-stage builds (distroless/alpine) |
| Orchestration | Kubernetes (EKS), Argo CD, Kustomize |
| CI/CD | GitHub Actions (OIDC), Docker Buildx, Dependabot |
| Security | Trivy (image + fs scan), Checkov (Terraform/K8s), cosign keyless, syft SBOM |
| Observability | Prometheus, Grafana (`kube-prometheus-stack`), CloudWatch alarms |
| Secrets | AWS Secrets Manager + External Secrets Operator (EKS); `.env` (local) |
| Cost | Infracost (PR cost-diff comments) |

---

## Prerequisites

### Local development

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | ≥ 4.x | [docker.com](https://www.docker.com/products/docker-desktop) |
| Git | any | — |

### AWS deployment (additional)

| Tool | Install |
|------|---------|
| AWS CLI v2 | `winget install Amazon.AWSCLI` |
| Terraform ≥ 1.5 | `winget install Hashicorp.Terraform` |
| kubectl | `winget install Kubernetes.kubectl` |
| Helm ≥ 3 | `winget install Helm.Helm` |
| GitHub CLI | `winget install GitHub.cli` |

### Supply chain verification (optional)

```powershell
winget install sigstore.cosign   # cosign keyless verify
```

---

## Local Development Setup

### 1. Clone and configure environment

```bash
git clone https://github.com/VoAnhKiet1410/mini-ecommerce-devops.git
cd mini-ecommerce-devops
cp .env.example .env
```

Edit `.env` if needed (defaults work out of the box):

```env
FRONTEND_PORT=8080
POSTGRES_PASSWORD=change-me-local-only   # local only — never commit real value
```

### 2. Start the stack

```bash
# Linux / macOS
docker compose up --build -d

# Windows PowerShell
docker compose up --build -d
```

Services started: `postgres`, `redis`, `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice`, `currencyservice`, `shippingservice`, `paymentservice`, `emailservice`.

### 3. Verify

```bash
# Linux / macOS
./scripts/smoke-local.sh
./scripts/verify-platform-db.sh

# Windows PowerShell
.\scripts\smoke-local.ps1
.\scripts\verify-platform-db.ps1
```

Both scripts should print **PASS**. Open **http://localhost:8080** to browse the store.

### 4. Useful commands

```bash
docker compose logs -f frontend        # stream frontend logs
docker compose logs -f cartservice     # stream cart logs
docker compose ps                      # check container status
docker compose down                    # stop all services
docker compose down -v                 # stop and remove volumes (reset DB)
```

---

## AWS Deployment

> **Cost warning:** the AWS stack costs ~$2–3 USD/hour (EKS node + RDS). Run `terraform destroy` when done.

### Step 1 — Bootstrap remote state (first time only)

```bash
cd infra/bootstrap/state
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set a unique S3 bucket name, e.g.:
#   bucket_name = "your-username-mini-ecommerce-tfstate-<aws-account-id>"
terraform init
terraform apply
```

The bootstrap creates an S3 bucket and DynamoDB table for Terraform state locking. **Do not destroy the bootstrap stack** — it persists across ephemeral demo cycles.

### Step 2 — Configure backend and variables

```bash
cd infra/environments/aws
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
```

Edit `backend.hcl`:
```hcl
bucket = "your-username-mini-ecommerce-tfstate-<aws-account-id>"
```

Edit `terraform.tfvars`:
```hcl
aws_region   = "ap-southeast-1"
project_name = "mini-ecommerce-devops"
github_org   = "YourGitHubOrg"
github_repo  = "mini-ecommerce-devops"
```

> **Never commit** `backend.hcl` or `terraform.tfvars` — they are gitignored.

### Step 3 — Apply infrastructure (~15 min)

```bash
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan
```

Resources created: VPC, EKS cluster + node group, ECR repos (4), RDS PostgreSQL, IAM OIDC + IRSA roles, Secrets Manager secret, CloudWatch alarms.

### Step 4 — Configure kubectl

```powershell
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops
kubectl get nodes   # should show 1 node Ready
```

### Step 5 — Install cluster tooling

Run the install scripts in order:

```powershell
.\scripts\install-aws-lbc.ps1      # AWS Load Balancer Controller
.\scripts\install-eso.ps1          # External Secrets Operator
.\scripts\install-argocd.ps1       # Argo CD + sync GitOps app
```

Each script is idempotent — safe to re-run. After `install-argocd.ps1`, verify:

```powershell
kubectl get pods -n boutique        # 6 pods should be Running
kubectl get ingress -n boutique     # ALB hostname appears
```

### Step 6 — Configure GitHub Actions secrets

Retrieve IAM role ARNs from Terraform outputs:

```bash
cd infra/environments/aws
terraform output github_actions_ecr_role_arn
terraform output github_actions_terraform_plan_role_arn
```

Set secrets in the GitHub repo (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|--------|-------|
| `AWS_ECR_ROLE_ARN` | `terraform output -raw github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | `terraform output -raw github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | Your S3 bucket name from bootstrap |
| `INFRACOST_API_KEY` | Free at [infracost.io](https://www.infracost.io) — `infracost auth login` then `infracost configure get api_key` |
| `GITOPS_REPO_TOKEN` | Fine-grained PAT scoped to `mini-ecommerce-gitops` with Contents + Pull requests **Read/Write** |

### Step 7 — Trigger CI

Push any change to `src/**` or use workflow dispatch:

```bash
gh workflow run ci-build-push.yml --ref main
```

CI will: build 4 images → Trivy gate → push to ECR → cosign sign → SBOM attest → open image-bump PR on gitops repo.

### Step 8 — Install monitoring

```powershell
$env:GRAFANA_ADMIN_PASSWORD = "YourPassword"
.\scripts\install-monitoring.ps1
.\scripts\verify-phase4.ps1
```

Access Grafana:
```powershell
kubectl port-forward svc/monitoring-grafana -n observability 3000:80
# Open http://localhost:3000  user: admin  password: YourPassword
```

Import dashboard: `observability/aws/dashboards/cluster-overview.json`

### Step 9 — Re-apply Terraform for ALB alarm

After Argo CD provisions the ALB (via AWS LBC), run Terraform again to pick up the ALB ARN for the CloudWatch alarm:

```bash
cd infra/environments/aws
terraform plan -out=tfplan
terraform apply tfplan    # adds 1 resource: ALB 5xx alarm
```

### Step 10 — Teardown (IMPORTANT)

```powershell
# If ALB/SG orphaned by Kubernetes block destroy:
aws elbv2 delete-load-balancer --load-balancer-arn <arn>
aws ec2 delete-security-group --group-id <sg-id>
aws ecr delete-repository --force --repository-name mini-ecommerce/<service>   # repeat x4

cd infra/environments/aws
terraform destroy
```

See [docs/runbooks/aws-down.md](docs/runbooks/aws-down.md) for the full safe teardown procedure.

---

## CI/CD Pipeline

### Build and Push (`ci-build-push.yml`)

Triggered on push to `src/**` or `workflow_dispatch`.

```
test-go (3 Go services in parallel)
    │
check-aws-secrets ──► skip gracefully if AWS_ECR_ROLE_ARN not set
    │
build-push (4 services in matrix, parallel)
    ├── docker build + push → ECR (sha + latest tags)
    ├── Trivy gate: FAIL on CRITICAL CVEs
    ├── Trivy SARIF: upload HIGH+CRITICAL as artifacts
    ├── cosign sign keyless (GitHub OIDC → Sigstore Fulcio)
    ├── syft SBOM (SPDX JSON) → uploaded as artifact
    └── cosign attest (SBOM attached to image in ECR)
    │
update-gitops
    └── kustomize edit set image → open PR on mini-ecommerce-gitops
```

### Terraform Plan (`terraform-plan.yml`)

Triggered on PRs touching `infra/**`.

```
plan job
    ├── terraform fmt -check
    ├── terraform validate
    ├── terraform plan (sticky PR comment)
    └── Checkov (baseline)

infracost job (parallel)
    ├── infracost breakdown (base branch)
    ├── infracost diff (PR branch)
    └── sticky PR comment with monthly cost estimate
```

### Security Scan (`security-scan.yml`)

Scheduled Mondays 06:00 UTC + on PR.

```
Checkov → Terraform + Kubernetes frameworks
Trivy fs → HIGH + CRITICAL in src/
```

---

## Supply Chain Security

Every happy-path image pushed to ECR is:

1. **Scanned** — Trivy fails the build on any CRITICAL CVE
2. **Signed** — cosign keyless (GitHub OIDC → ephemeral certificate from Sigstore Fulcio; logged in Rekor)
3. **Attested** — syft SPDX SBOM attached as OCI attestation

Verify a built image locally:

```powershell
# Windows — requires: aws CLI (authenticated) + cosign (winget install sigstore.cosign)
.\scripts\verify-image-signature.ps1                          # frontend:latest
.\scripts\verify-image-signature.ps1 -Service cartservice -Tag <git-sha>

# Linux / macOS
./scripts/verify-image-signature.sh
./scripts/verify-image-signature.sh cartservice <git-sha>
```

See [docs/runbooks/supply-chain.md](docs/runbooks/supply-chain.md) for the full signing flow and SBOM inspection.

---

## Observability

| Component | What it covers |
|-----------|---------------|
| Prometheus | Kubernetes workload metrics (kube-state-metrics, node-exporter) |
| Grafana | Cluster overview dashboard (`observability/aws/dashboards/cluster-overview.json`) |
| CloudWatch | RDS CPU high, RDS free storage low, ALB 5xx target errors |

![Grafana cluster overview — Online Boutique pods on EKS](docs/assets/grafana-cluster-overview.svg)

---

## Environment Variables Reference

### Local (`.env` — copy from `.env.example`, never commit)

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_PORT` | `8080` | Host port for the frontend |
| `PRODUCT_CATALOG_SERVICE_ADDR` | `productcatalogservice:3550` | gRPC address |
| `CART_SERVICE_ADDR` | `cartservice:7070` | gRPC address |
| `CHECKOUT_SERVICE_ADDR` | `checkoutservice:5050` | gRPC address |
| `CURRENCY_SERVICE_ADDR` | `currencyservice:7000` | gRPC address |
| `SHIPPING_SERVICE_ADDR` | `shippingservice:50051` | gRPC address |
| `REDIS_ADDR` | `redis:6379` | Redis for cartservice |
| `POSTGRES_HOST` | `localhost` | Platform DB host |
| `POSTGRES_PORT` | `5432` | Platform DB port |
| `POSTGRES_DB` | `platform` | Database name |
| `POSTGRES_USER` | `platform` | DB user |
| `POSTGRES_PASSWORD` | `change-me-local-only` | **Never commit a real value** |

### GitHub Actions Secrets

| Secret | Source |
|--------|--------|
| `AWS_ECR_ROLE_ARN` | `terraform output -raw github_actions_ecr_role_arn` |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | `terraform output -raw github_actions_terraform_plan_role_arn` |
| `AWS_TF_STATE_BUCKET` | S3 bucket name from `infra/bootstrap/state` |
| `INFRACOST_API_KEY` | `infracost configure get api_key` (free account) |
| `GITOPS_REPO_TOKEN` | Fine-grained PAT — `mini-ecommerce-gitops` only, Contents + PRs RW |

### Terraform Variables (`infra/environments/aws/terraform.tfvars` — gitignored)

| Variable | Description |
|----------|-------------|
| `aws_region` | AWS region (default `ap-southeast-1`) |
| `project_name` | Resource name prefix (default `mini-ecommerce-devops`) |
| `github_org` | GitHub organization/username |
| `github_repo` | Repository name (without org) |

---

## Repository Structure

```
.
├── .github/workflows/
│   ├── ci-build-push.yml        # Build → Trivy → ECR → cosign/SBOM → GitOps PR
│   ├── terraform-plan.yml       # Plan + Checkov + Infracost on infra/ PRs
│   └── security-scan.yml        # Checkov + Trivy fs (scheduled + PR)
├── src/
│   ├── frontend/                # Go HTTP server (gorilla/mux)
│   ├── productcatalogservice/   # Go gRPC — catalog from products.json
│   ├── cartservice/             # C# .NET gRPC — Redis-backed cart
│   ├── checkoutservice/         # Go gRPC — order orchestrator
│   ├── currencyservice/         # Node.js gRPC — currency conversion
│   ├── paymentservice/          # Node.js gRPC — mock payment
│   ├── emailservice/            # Python gRPC — mock email
│   ├── shippingservice/         # Go gRPC — mock shipping
│   └── protos/                  # Shared protobuf definitions
├── infra/
│   ├── bootstrap/state/         # S3 + DynamoDB for Terraform remote state
│   ├── environments/aws/        # Root module (VPC, EKS, ECR, RDS, IAM, …)
│   └── modules/                 # ecr, eks, iam-github-oidc, iam-irsa,
│                                #   rds, secrets, observability-cloudwatch, vpc
├── observability/aws/
│   ├── dashboards/              # Grafana dashboard JSON
│   └── helm-values/             # kube-prometheus-stack values
├── scripts/                     # .sh + .ps1 pairs for every operation
├── docs/
│   ├── architecture.md          # Mermaid system diagram
│   └── runbooks/                # aws-up, aws-down, observability,
│                                #   github-actions-setup, supply-chain, demo-checklist
└── docker-compose.yml           # Local stack: all 8 happy-path services
```

---

## Portfolio Highlights

- Provisioned **AWS EKS**, **ECR**, **RDS PostgreSQL 16**, and **ALB** using **Terraform** (`ap-southeast-1`); remote state with S3 + DynamoDB; ephemeral cost model with full `terraform destroy` procedure.
- Built **GitHub Actions** CI with **OIDC** (no long-lived credentials): multi-service matrix build, **Trivy** CRITICAL gate, ECR push, **Checkov** IaC scan.
- Secured the software supply chain: **cosign keyless signing** (Sigstore Fulcio/Rekor) + **syft SPDX SBOM** attestations on every image, verified against the GitHub Actions OIDC identity.
- Implemented a **closed GitOps loop**: CI auto-opens Kustomize image-bump PRs; **Argo CD** deploys after human review — two-repo model with **External Secrets Operator** syncing credentials from **AWS Secrets Manager**.
- Added **FinOps guardrails**: **Infracost** cost-diff sticky comment on every infrastructure PR.
- Deployed and operated **Prometheus**, **Grafana**, and **CloudWatch alarms** for live workload observability on Kubernetes.

**Recruiter demo script:** [docs/runbooks/demo-checklist.md](docs/runbooks/demo-checklist.md)

---

## Runbooks

| Document | Purpose |
|----------|---------|
| [docs/runbooks/aws-up.md](docs/runbooks/aws-up.md) | Step-by-step AWS stack bring-up |
| [docs/runbooks/aws-down.md](docs/runbooks/aws-down.md) | Safe teardown procedure |
| [docs/runbooks/github-actions-setup.md](docs/runbooks/github-actions-setup.md) | GitHub secrets + OIDC trust configuration |
| [docs/runbooks/observability.md](docs/runbooks/observability.md) | Prometheus / Grafana / CloudWatch setup |
| [docs/runbooks/supply-chain.md](docs/runbooks/supply-chain.md) | cosign sign, attest, verify flow |
| [docs/runbooks/demo-checklist.md](docs/runbooks/demo-checklist.md) | Recruiter demo script |

---

## Notes

- **RDS is a platform database** — happy-path services use upstream storage (Redis, in-memory catalog); RDS is provisioned as infrastructure foundation, not used by the application in Phase 1.
- **AWS account:** `962765735385`, region: `ap-southeast-1`, EKS cluster: `mini-ecommerce-devops`.
- **State bucket:** `voanhkiet1410-mini-ecommerce-tfstate-962765735385` (persists across destroy/apply cycles).
