# Mini E-commerce DevOps Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portfolio-grade DevOps platform around Google microservices-demo (happy-path services only) with local Docker Compose, ephemeral AWS (EKS/ECR/RDS/ALB), Terraform IaC, GitHub Actions CI (OIDC), Argo CD GitOps (Kustomize), Secrets Manager + ESO, and Prometheus/Grafana/CloudWatch observability.

**Architecture:** Approach A from the spec — keep upstream app persistence (Redis, in-memory catalog); provision PostgreSQL as a **platform database**. Two public repos: app repo (`src/` + `infra/` + Compose + CI) and GitOps repo (Kustomize base/overlays/aws). Images built in CI → ECR; manifests reference ECR tags; Argo CD syncs overlay `aws`.

**Tech Stack:** microservices-demo (Go/gRPC services), Docker Compose, Terraform 1.5+, AWS (EKS 1.29+, ECR, RDS PostgreSQL 16, ALB, Secrets Manager, CloudWatch), GitHub Actions, Argo CD 2.10+, External Secrets Operator, Kustomize, Helm (bootstrap only: LBC, Argo, ESO, kube-prometheus-stack), Trivy, Checkov.

**Spec reference:** `docs/superpowers/specs/2026-06-01-mini-ecommerce-devops-platform-spec.md`

**Replace before starting:** `YOUR_ORG` → GitHub username/org, `YOUR_AWS_ACCOUNT_ID` → 12-digit account ID, `your-aws-profile` → AWS CLI profile name.

---

## File Map (created by end of plan)

### App repo (`mini-ecommerce-devops`)

| Path | Responsibility |
|------|----------------|
| `src/` | Forked microservices-demo source (4 services + protos) |
| `docker-compose.yml` | Happy-path local stack |
| `.env.example` | Non-secret local config template |
| `scripts/verify-platform-db.sh` | Proves Postgres connectivity (platform DB) |
| `scripts/smoke-local.sh` | HTTP smoke test against frontend |
| `infra/bootstrap/state/` | One-time S3 + DynamoDB for Terraform remote state |
| `infra/modules/vpc/` | VPC, subnets, single NAT |
| `infra/modules/eks/` | EKS cluster + 1× MNG |
| `infra/modules/ecr/` | ECR repos per service |
| `infra/modules/rds/` | RDS PostgreSQL + SG |
| `infra/modules/iam-github-oidc/` | GitHub OIDC roles (ECR + tf plan) |
| `infra/modules/iam-irsa/` | IRSA for LBC, ESO |
| `infra/modules/secrets/` | Secrets Manager secrets (RDS) |
| `infra/environments/aws/` | Root module wiring |
| `.github/workflows/ci-build-push.yml` | Build, Trivy, push ECR |
| `.github/workflows/terraform-plan.yml` | fmt, validate, Checkov, plan |
| `.github/workflows/security-scan.yml` | FS Trivy + Checkov on PR |
| `docs/architecture.md` | Diagram + decisions |
| `docs/runbooks/aws-up.md` | Bring-up sequence |
| `docs/runbooks/aws-down.md` | Teardown sequence |
| `docs/runbooks/demo-checklist.md` | Recruiter demo script |
| `README.md` | English portfolio entry |

### GitOps repo (`mini-ecommerce-gitops`)

| Path | Responsibility |
|------|----------------|
| `apps/online-boutique/base/` | Kustomize base (4 apps + redis + ns) |
| `apps/online-boutique/overlays/aws/` | ECR images, ingress, resources, ESO |
| `clusters/aws/apps.yaml` | Argo CD Application |
| `clusters/aws/project.yaml` | Argo CD AppProject |
| `bootstrap/argocd/` | Optional app-of-apps |
| `observability/aws/` | Prometheus/Grafana values or kustomize |

---

## Phase 0 — Foundation

### Task 0.1: Initialize app repository layout

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `docs/architecture.md` (skeleton)

- [ ] **Step 1: Create `.gitignore`**

```gitignore
.env
.env.*
!.env.example
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl
*.tfvars
!*.tfvars.example
.idea/
.vscode/
__pycache__/
.DS_Store
```

- [ ] **Step 2: Create minimal `README.md`**

```markdown
# Mini E-commerce DevOps Platform

Portfolio DevOps project based on [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (happy-path services only).

## Quick start (local)

```bash
cp .env.example .env
docker compose up --build -d
./scripts/smoke-local.sh
```

Open http://localhost:8080

## Architecture

See [docs/architecture.md](docs/architecture.md).

## AWS (ephemeral)

See [docs/runbooks/aws-up.md](docs/runbooks/aws-up.md). **Run `terraform destroy` when finished.**

## Platform database disclosure

RDS/Compose PostgreSQL is provisioned as a **platform database**. Happy-path services use upstream storage (Redis, in-memory catalog) in Phase 1.
```

- [ ] **Step 3: Verify git status**

Run: `git status`
Expected: untracked `.gitignore`, `README.md`

- [ ] **Step 4: Commit**

```bash
git init
git add .gitignore README.md docs/architecture.md
git commit -m "chore: initialize app repository skeleton"
```

---

### Task 0.2: Vendor microservices-demo source (fork)

**Files:**
- Create: `src/` (via git subtree or fork clone)

- [ ] **Step 1: Add upstream as remote and sparse checkout of needed paths**

Run from repo root:

```bash
git remote add upstream https://github.com/GoogleCloudPlatform/microservices-demo.git
git fetch upstream --depth 1
git checkout -b vendor/upstream-main FETCH_HEAD -- src/frontend src/cartservice src/productcatalogservice src/checkoutservice src/shoppingassistantservice src/ protos/ release/ istio-manifests/ 2>/dev/null || true
```

If sparse checkout is awkward on Windows, use **fork** instead:

```bash
# Alternative: clone and copy
git clone --depth 1 https://github.com/GoogleCloudPlatform/microservices-demo.git /tmp/microservices-demo
mkdir -p src
cp -r /tmp/microservices-demo/src/frontend src/
cp -r /tmp/microservices-demo/src/cartservice src/
cp -r /tmp/microservices-demo/src/productcatalogservice src/
cp -r /tmp/microservices-demo/src/checkoutservice src/
cp -r /tmp/microservices-demo/protos src/protos
```

- [ ] **Step 2: Confirm Dockerfiles exist**

Run:

```bash
ls src/frontend/Dockerfile src/cartservice/Dockerfile src/productcatalogservice/Dockerfile src/checkoutservice/Dockerfile
```

Expected: four paths listed

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "chore: vendor microservices-demo happy-path service sources"
```

---

### Task 0.3: Docker Compose — happy path + Redis + PostgreSQL

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `scripts/smoke-local.sh`
- Create: `scripts/verify-platform-db.sh`

- [ ] **Step 1: Create `.env.example`**

```env
# Frontend
FRONTEND_PORT=8080
FRONTEND_ADDR=frontend:8080

# Service addresses (gRPC/HTTP as per upstream)
PRODUCT_CATALOG_SERVICE_ADDR=productcatalogservice:3550
CART_SERVICE_ADDR=cartservice:7070
CHECKOUT_SERVICE_ADDR=checkoutservice:5050

# Redis (carts)
REDIS_ADDR=redis:6379

# Platform PostgreSQL (not used by apps in Phase 1)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=platform
POSTGRES_USER=platform
POSTGRES_PASSWORD=change-me-local-only
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
name: mini-ecommerce-devops

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-platform}
      POSTGRES_USER: ${POSTGRES_USER:-platform}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change-me-local-only}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-platform}"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  productcatalogservice:
    build:
      context: src/productcatalogservice
    environment:
      PORT: "3550"
    depends_on:
      redis:
        condition: service_started

  cartservice:
    build:
      context: src/cartservice
    environment:
      REDIS_ADDR: ${REDIS_ADDR:-redis:6379}
    depends_on:
      redis:
        condition: service_healthy

  checkoutservice:
    build:
      context: src/checkoutservice
    environment:
      PRODUCT_CATALOG_SERVICE_ADDR: ${PRODUCT_CATALOG_SERVICE_ADDR:-productcatalogservice:3550}
      CART_SERVICE_ADDR: ${CART_SERVICE_ADDR:-cartservice:7070}
      # Phase 1: payment/shipping disabled — checkout may log errors on place order; UI browse/cart still works
    depends_on:
      - productcatalogservice
      - cartservice

  frontend:
    build:
      context: src/frontend
    environment:
      PORT: "8080"
      PRODUCT_CATALOG_SERVICE_ADDR: ${PRODUCT_CATALOG_SERVICE_ADDR:-productcatalogservice:3550}
      CART_SERVICE_ADDR: ${CART_SERVICE_ADDR:-cartservice:7070}
      CHECKOUT_SERVICE_ADDR: ${CHECKOUT_SERVICE_ADDR:-checkoutservice:5050}
      SHIPPING_SERVICE_ADDR: "" 
      CURRENCY_SERVICE_ADDR: ""
    ports:
      - "${FRONTEND_PORT:-8080}:8080"
    depends_on:
      - productcatalogservice
      - cartservice
      - checkoutservice
```

> **Note:** If `frontend` build fails due to missing optional services, patch `src/frontend` env defaults per upstream `main.go` / deployment manifests — only change env wiring, not business logic.

- [ ] **Step 3: Create `scripts/verify-platform-db.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
source .env 2>/dev/null || true
PGPASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}" psql \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-platform}" \
  -d "${POSTGRES_DB:-platform}" \
  -c "SELECT 1 AS platform_db_ok;"
echo "Platform PostgreSQL connectivity OK"
```

- [ ] **Step 4: Create `scripts/smoke-local.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
PORT="${FRONTEND_PORT:-8080}"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/")
if [[ "$code" != "200" ]]; then
  echo "FAIL: expected HTTP 200, got $code"
  exit 1
fi
echo "PASS: frontend HTTP 200"
```

- [ ] **Step 5: Make scripts executable (Git Bash / WSL)**

```bash
chmod +x scripts/smoke-local.sh scripts/verify-platform-db.sh
```

- [ ] **Step 6: Bring up stack and verify**

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
./scripts/verify-platform-db.sh
./scripts/smoke-local.sh
```

Expected: all services `running` or `healthy`; smoke prints `PASS`

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example scripts/
git commit -m "feat: add local Docker Compose happy-path stack with platform Postgres"
```

---

### Task 0.4: Architecture doc + create GitHub repos

**Files:**
- Modify: `docs/architecture.md`
- Create: (remote) `github.com/YOUR_ORG/mini-ecommerce-devops`
- Create: (remote) `github.com/YOUR_ORG/mini-ecommerce-gitops`

- [ ] **Step 1: Write `docs/architecture.md` (Mermaid + decisions)**

Include:
- System context diagram (from spec §5)
- Happy-path service table
- Two-repo model
- Platform DB vs app storage disclosure
- Ephemeral AWS teardown policy

- [ ] **Step 2: Create public GitHub repositories**

```bash
gh repo create YOUR_ORG/mini-ecommerce-devops --public --source=. --remote=origin --push
gh repo create YOUR_ORG/mini-ecommerce-gitops --public --clone
```

If `gh` unavailable: create repos in GitHub UI, then:

```bash
git remote add origin git@github.com:YOUR_ORG/mini-ecommerce-devops.git
git push -u origin main
```

- [ ] **Step 3: Commit docs**

```bash
git add docs/architecture.md
git commit -m "docs: add architecture diagram and design decisions"
git push origin main
```

---

## Phase 1 — AWS core (Terraform + bootstrap)

### Task 1.1: Terraform remote state bootstrap

**Files:**
- Create: `infra/bootstrap/state/main.tf`
- Create: `infra/bootstrap/state/variables.tf`
- Create: `infra/bootstrap/state/outputs.tf`
- Create: `infra/bootstrap/state/terraform.tfvars.example`

- [ ] **Step 1: Create bootstrap `main.tf`**

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  tags = var.tags
}
```

- [ ] **Step 2: Create `variables.tf`**

```hcl
variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "state_bucket_name" {
  type = string
}

variable "lock_table_name" {
  type    = string
  default = "mini-ecommerce-devops-tflock"
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "mini-ecommerce-devops"
    Environment = "shared"
    ManagedBy   = "terraform"
  }
}
```

- [ ] **Step 3: Apply bootstrap once (local state OK for bootstrap only)**

```bash
cd infra/bootstrap/state
cp terraform.tfvars.example terraform.tfvars
# Edit: state_bucket_name = "YOUR_ORG-mini-ecommerce-tfstate-UNIQUE"
terraform init
terraform apply -auto-approve
terraform output
```

Record `bucket` and `dynamodb_table` for next task.

- [ ] **Step 4: Commit**

```bash
git add infra/bootstrap/
git commit -m "feat: add Terraform remote state bootstrap (S3 + DynamoDB)"
```

---

### Task 1.2: VPC module

**Files:**
- Create: `infra/modules/vpc/main.tf`
- Create: `infra/modules/vpc/variables.tf`
- Create: `infra/modules/vpc/outputs.tf`

- [ ] **Step 1: Implement VPC (2 AZ, public + private, 1 NAT)**

`infra/modules/vpc/main.tf` — use `terraform-aws-modules/vpc/aws` version `~> 5.0`:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = var.name
  cidr = var.cidr

  azs             = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = var.tags
}
```

`variables.tf`: `name`, `cidr`, `azs` (default `["ap-southeast-1a", "ap-southeast-1b"]`), subnets, `tags`.

`outputs.tf`: `vpc_id`, `private_subnets`, `public_subnets`.

- [ ] **Step 2: Validate module**

```bash
cd infra/modules/vpc
terraform init
terraform validate
```

Expected: `Success!`

- [ ] **Step 3: Commit**

```bash
git add infra/modules/vpc/
git commit -m "feat: add VPC module with single NAT gateway"
```

---

### Task 1.3: EKS module (1× MNG, t3.small)

**Files:**
- Create: `infra/modules/eks/main.tf`
- Create: `infra/modules/eks/variables.tf`
- Create: `infra/modules/eks/outputs.tf`

- [ ] **Step 1: Implement EKS with `terraform-aws-modules/eks/aws` ~> 20.0**

Key inputs:
- `cluster_name = "mini-ecommerce-devops"`
- `cluster_version = "1.29"`
- `vpc_id`, `subnet_ids` = private subnets
- Managed node group: `instance_types = ["t3.small"]`, `min=1`, `max=1`, `desired=1`
- `enable_cluster_creator_admin_permissions = true`

Outputs: `cluster_name`, `cluster_endpoint`, `oidc_provider_arn`, `cluster_security_group_id`.

- [ ] **Step 2: Validate**

```bash
cd infra/modules/eks
terraform init
terraform validate
```

- [ ] **Step 3: Commit**

```bash
git add infra/modules/eks/
git commit -m "feat: add EKS module with single t3.small managed node group"
```

---

### Task 1.4: ECR module (four repositories)

**Files:**
- Create: `infra/modules/ecr/main.tf`
- Create: `infra/modules/ecr/variables.tf`
- Create: `infra/modules/ecr/outputs.tf`

- [ ] **Step 1: Create repos with scan on push**

```hcl
variable "repository_names" {
  type    = list(string)
  default = ["frontend", "productcatalogservice", "cartservice", "checkoutservice"]
}

resource "aws_ecr_repository" "this" {
  for_each             = toset(var.repository_names)
  name                 = "mini-ecommerce/${each.key}"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = var.tags
}

output "repository_urls" {
  value = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/modules/ecr/
git commit -m "feat: add ECR repositories for happy-path services"
```

---

### Task 1.5: RDS PostgreSQL module

**Files:**
- Create: `infra/modules/rds/main.tf`
- Create: `infra/modules/rds/variables.tf`
- Create: `infra/modules/rds/outputs.tf`

- [ ] **Step 1: RDS `db.t4g.micro`, Postgres 16, private subnets**

```hcl
resource "random_password" "master" {
  length  = 24
  special = true
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_security_group" "this" {
  name_prefix = "${var.name}-rds-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

resource "aws_db_instance" "this" {
  identifier             = var.name
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = var.database_name
  username               = var.master_username
  password               = random_password.master.result
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false
  skip_final_snapshot    = var.skip_final_snapshot
  tags                   = var.tags
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "master_password" {
  value     = random_password.master.result
  sensitive = true
}
```

- [ ] **Step 2: Commit**

```bash
git add infra/modules/rds/
git commit -m "feat: add RDS PostgreSQL module for platform database"
```

---

### Task 1.6: IAM — GitHub OIDC + IRSA stubs

**Files:**
- Create: `infra/modules/iam-github-oidc/main.tf`
- Create: `infra/modules/iam-irsa/main.tf`

- [ ] **Step 1: GitHub OIDC provider + roles**

`iam-github-oidc/main.tf`:
- `aws_iam_openid_connect_provider` for `token.actions.githubusercontent.com`
- Role `github-actions-ecr` trust: `repo:YOUR_ORG/mini-ecommerce-devops:*`
- Policy: ECR push to `mini-ecommerce/*` repos
- Role `github-actions-terraform-plan` with `ReadOnlyAccess` or scoped `terraform plan` policy (no `apply`)

- [ ] **Step 2: IRSA module pattern**

Use `terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks` for:
- `alb-controller` (AWS Load Balancer Controller policy)
- `external-secrets` (SecretsManagerReadWrite scoped to project secrets)

Outputs: role ARNs for Helm serviceAccount annotations.

- [ ] **Step 3: Commit**

```bash
git add infra/modules/iam-github-oidc/ infra/modules/iam-irsa/
git commit -m "feat: add GitHub OIDC and IRSA IAM modules"
```

---

### Task 1.7: Secrets Manager module (RDS credentials)

**Files:**
- Create: `infra/modules/secrets/main.tf`

- [ ] **Step 1: Store RDS JSON secret**

```hcl
resource "aws_secretsmanager_secret" "rds_master" {
  name = "${var.prefix}/rds/master"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds_master" {
  secret_id = aws_secretsmanager_secret.rds_master.id
  secret_string = jsonencode({
    username = var.username
    password = var.password
    host     = var.host
    port     = 5432
    dbname   = var.dbname
  })
}
```

Wire from `environments/aws` with RDS module outputs.

- [ ] **Step 2: Commit**

```bash
git add infra/modules/secrets/
git commit -m "feat: add Secrets Manager module for RDS master credentials"
```

---

### Task 1.8: Root environment `infra/environments/aws`

**Files:**
- Create: `infra/environments/aws/backend.tf`
- Create: `infra/environments/aws/main.tf`
- Create: `infra/environments/aws/variables.tf`
- Create: `infra/environments/aws/outputs.tf`
- Create: `infra/environments/aws/terraform.tfvars.example`
- Create: `infra/README.md`

- [ ] **Step 1: Configure remote backend**

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "YOUR_ORG-mini-ecommerce-tfstate-UNIQUE"
    key            = "aws/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "mini-ecommerce-devops-tflock"
    encrypt        = true
  }
}
```

- [ ] **Step 2: Wire all modules in `main.tf`**

Call modules: `vpc`, `eks`, `ecr`, `rds` (allowed SG = EKS node/cluster SG), `iam-github-oidc`, `secrets`, output `ecr_repository_urls`, `eks_cluster_name`, `rds_endpoint`, `github_actions_ecr_role_arn`.

- [ ] **Step 3: Create `terraform.tfvars.example`**

```hcl
aws_region          = "ap-southeast-1"
project_name        = "mini-ecommerce-devops"
github_org          = "YOUR_ORG"
github_repo         = "mini-ecommerce-devops"
rds_skip_final_snapshot = true
```

- [ ] **Step 4: Plan and apply locally**

```bash
cd infra/environments/aws
cp terraform.tfvars.example terraform.tfvars
# edit values
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Expected: ~15–25 min; outputs include EKS endpoint, ECR URLs.

- [ ] **Step 5: Configure kubectl**

```bash
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops --profile your-aws-profile
kubectl get nodes
```

Expected: 1 node `Ready`

- [ ] **Step 6: Commit** (no `terraform.tfvars`, no state)

```bash
git add infra/environments/aws/ infra/README.md
git commit -m "feat: add AWS root Terraform environment wiring all modules"
```

---

### Task 1.9: Runbooks aws-up / aws-down

**Files:**
- Create: `docs/runbooks/aws-up.md`
- Create: `docs/runbooks/aws-down.md`
- Create: `docs/runbooks/demo-checklist.md`

- [ ] **Step 1: Document aws-up sequence**

Include exact commands:
1. `terraform apply` in `infra/environments/aws`
2. `aws eks update-kubeconfig`
3. Helm install AWS Load Balancer Controller (cite IRSA role ARN output)
4. Helm install External Secrets Operator
5. Helm install Argo CD (namespace `argocd`)
6. Apply GitOps `clusters/aws/apps.yaml` (after Phase 3)
7. `kubectl get ingress -n boutique` → ALB hostname
8. `curl -I http://<alb-host>/`

- [ ] **Step 2: Document aws-down**

```bash
cd infra/environments/aws
terraform destroy
```

Note: confirm `rds_skip_final_snapshot = true` in tfvars.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/
git commit -m "docs: add AWS bring-up and teardown runbooks"
```

---

### Task 1.10: Install AWS Load Balancer Controller (manual bootstrap)

**Files:**
- Modify: `docs/runbooks/aws-up.md` (append helm values)

- [ ] **Step 1: Add IAM policy to LBC IRSA (if not fully in Terraform)**

Follow AWS docs: download IAM policy JSON for LBC v2.7+.

- [ ] **Step 2: Helm install**

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=mini-ecommerce-devops \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/mini-ecommerce-alb-controller
```

- [ ] **Step 3: Verify controller pods**

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

Expected: `Running`

- [ ] **Step 4: Commit runbook updates only**

```bash
git add docs/runbooks/aws-up.md
git commit -m "docs: add AWS Load Balancer Controller helm install steps"
```

---

## Phase 2 — CI/CD + ECR

### Task 2.1: GitHub Actions — OIDC + build push

**Files:**
- Create: `.github/workflows/ci-build-push.yml`

- [ ] **Step 1: Add workflow**

```yaml
name: CI Build and Push to ECR

on:
  push:
    branches: [main]
    paths:
      - "src/**"
      - ".github/workflows/ci-build-push.yml"
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-southeast-1

jobs:
  build-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - name: frontend
            context: src/frontend
          - name: productcatalogservice
            context: src/productcatalogservice
          - name: cartservice
            context: src/cartservice
          - name: checkoutservice
            context: src/checkoutservice
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ECR_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.service.context }}
          push: true
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/mini-ecommerce/${{ matrix.service.name }}:${{ github.sha }}
            ${{ steps.login-ecr.outputs.registry }}/mini-ecommerce/${{ matrix.service.name }}:latest

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ${{ steps.login-ecr.outputs.registry }}/mini-ecommerce/${{ matrix.service.name }}:${{ github.sha }}
          format: sarif
          output: trivy-${{ matrix.service.name }}.sarif
          severity: CRITICAL,HIGH
          exit-code: "0"

      - name: Upload Trivy report
        uses: github/upload-artifact@v4
        with:
          name: trivy-${{ matrix.service.name }}
          path: trivy-${{ matrix.service.name }}.sarif
```

- [ ] **Step 2: Add GitHub secret `AWS_ECR_ROLE_ARN`**

Value = output `github_actions_ecr_role_arn` from Terraform.

- [ ] **Step 3: Push and verify workflow**

```bash
git add .github/workflows/ci-build-push.yml
git commit -m "ci: build and push happy-path images to ECR via OIDC"
git push origin main
```

Expected: green workflow; images in ECR console.

- [ ] **Step 4: Record image URIs for GitOps**

Example:
`123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/frontend:<sha>`

---

### Task 2.2: Terraform plan on PR + Checkov

**Files:**
- Create: `.github/workflows/terraform-plan.yml`
- Create: `.github/workflows/security-scan.yml`
- Create: `.checkov.yml`

- [ ] **Step 1: `terraform-plan.yml`**

```yaml
name: Terraform Plan

on:
  pull_request:
    paths:
      - "infra/**"
      - ".github/workflows/terraform-plan.yml"

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/environments/aws
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_PLAN_ROLE_ARN }}
          aws-region: ap-southeast-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.5.7
      - run: terraform init -input=false
      - run: terraform fmt -check -recursive
      - run: terraform validate
      - run: terraform plan -no-color -input=false 2>&1 | tee plan.txt
      - uses: bridgecrewio/checkov-action@master
        with:
          directory: infra/
          framework: terraform
          soft_fail: true
      - uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infra/environments/aws/plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Terraform Plan\n```\n' + plan.slice(0, 60000) + '\n```'
            });
```

- [ ] **Step 2: Add secret `AWS_TERRAFORM_PLAN_ROLE_ARN`**

- [ ] **Step 3: `.checkov.yml`**

```yaml
quiet: true
compact: true
framework:
  - terraform
  - kubernetes
skip-check:
  # Document any intentional skips with justification in README
```

- [ ] **Step 4: Commit and open test PR touching `infra/`**

Expected: PR comment with plan; Checkov results in Actions log.

```bash
git add .github/workflows/ .checkov.yml
git commit -m "ci: add Terraform plan on PR with Checkov"
git push
```

---

## Phase 3 — GitOps (Kustomize + Argo CD + ESO)

### Task 3.1: Initialize GitOps repository

**Files:** (in `mini-ecommerce-gitops` repo)

- Create: `apps/online-boutique/base/namespace.yaml`
- Create: `apps/online-boutique/base/kustomization.yaml`
- Create: per-service Deployment + Service YAML

- [ ] **Step 1: `namespace.yaml`**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: boutique
  labels:
    app.kubernetes.io/part-of: online-boutique
```

- [ ] **Step 2: `base/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: boutique
resources:
  - namespace.yaml
  - redis/deployment.yaml
  - redis/service.yaml
  - productcatalogservice/deployment.yaml
  - productcatalogservice/service.yaml
  - cartservice/deployment.yaml
  - cartservice/service.yaml
  - checkoutservice/deployment.yaml
  - checkoutservice/service.yaml
  - frontend/deployment.yaml
  - frontend/service.yaml
```

- [ ] **Step 3: Example `frontend/deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: server
          image: frontend:PLACEHOLDER
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
            - name: PRODUCT_CATALOG_SERVICE_ADDR
              value: "productcatalogservice:3550"
            - name: CART_SERVICE_ADDR
              value: "cartservice:7070"
            - name: CHECKOUT_SERVICE_ADDR
              value: "checkoutservice:5050"
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

Repeat pattern for other services; `cartservice` env `REDIS_ADDR=redis:6379`.

- [ ] **Step 4: Commit in gitops repo**

```bash
cd mini-ecommerce-gitops
git add apps/
git commit -m "feat: add Kustomize base for happy-path online boutique"
git push origin main
```

---

### Task 3.2: AWS overlay — ECR images + Ingress (ALB)

**Files:**
- Create: `apps/online-boutique/overlays/aws/kustomization.yaml`
- Create: `apps/online-boutique/overlays/aws/ingress.yaml`
- Create: `apps/online-boutique/overlays/aws/patches/images.yaml`

- [ ] **Step 1: `overlays/aws/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - ingress.yaml
images:
  - name: frontend
    newName: YOUR_AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/frontend
    newTag: latest
  - name: productcatalogservice
    newName: YOUR_AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/productcatalogservice
    newTag: latest
  - name: cartservice
    newName: YOUR_AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/cartservice
    newTag: latest
  - name: checkoutservice
    newName: YOUR_AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/checkoutservice
    newTag: latest
```

- [ ] **Step 2: `ingress.yaml` (ALB, HTTP)**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80}]'
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

Ensure `frontend` Service maps port 80 → targetPort 8080.

- [ ] **Step 3: Validate kustomize build locally**

```bash
kubectl kustomize apps/online-boutique/overlays/aws | head -n 40
```

Expected: rendered manifests with ECR URIs

- [ ] **Step 4: Commit**

```bash
git add apps/online-boutique/overlays/aws/
git commit -m "feat: add AWS overlay with ECR images and ALB ingress"
git push
```

---

### Task 3.3: External Secrets Operator + ClusterSecretStore

**Files:**
- Create: `apps/online-boutique/overlays/aws/external-secrets/cluster-secret-store.yaml`
- Create: `apps/online-boutique/overlays/aws/external-secrets/rds-externalsecret.yaml`

- [ ] **Step 1: Helm install ESO**

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

- [ ] **Step 2: `ClusterSecretStore`**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-southeast-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

Annotate ESO serviceAccount with IRSA role ARN (from Terraform).

- [ ] **Step 3: `ExternalSecret` for RDS (optional sync)**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rds-master
  namespace: boutique
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: rds-master
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: mini-ecommerce-devops/rds/master
```

- [ ] **Step 4: Commit manifests; apply after Argo sync or kubectl**

```bash
git add apps/online-boutique/overlays/aws/external-secrets/
git commit -m "feat: add External Secrets for RDS platform credentials"
git push
```

---

### Task 3.4: Argo CD bootstrap + Application

**Files:**
- Create: `clusters/aws/project.yaml`
- Create: `clusters/aws/apps.yaml`
- Modify: `docs/runbooks/aws-up.md`

- [ ] **Step 1: Install Argo CD**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.7/manifests/install.yaml
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s
```

- [ ] **Step 2: `clusters/aws/project.yaml`**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: boutique
  namespace: argocd
spec:
  sourceRepos:
    - https://github.com/YOUR_ORG/mini-ecommerce-gitops.git
  destinations:
    - namespace: boutique
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"
```

- [ ] **Step 3: `clusters/aws/apps.yaml`**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: online-boutique
  namespace: argocd
spec:
  project: boutique
  source:
    repoURL: https://github.com/YOUR_ORG/mini-ecommerce-gitops.git
    targetRevision: main
    path: apps/online-boutique/overlays/aws
  destination:
    server: https://kubernetes.default.svc
    namespace: boutique
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

- [ ] **Step 4: Register GitOps repo in Argo CD UI/CLI**

```bash
argocd login <argocd-server> --core
kubectl apply -f clusters/aws/project.yaml
kubectl apply -f clusters/aws/apps.yaml
```

- [ ] **Step 5: Wait for sync and get ALB URL**

```bash
kubectl get ingress -n boutique
curl -I http://<ALB-DNS>/
```

Expected: HTTP 200

- [ ] **Step 6: Commit + update runbook**

```bash
git add clusters/aws/
git commit -m "feat: add Argo CD Application for online-boutique AWS overlay"
git push
```

---

### Task 3.5: End-to-end smoke on AWS

**Files:**
- Create: `scripts/smoke-aws.sh` (in app repo)

- [ ] **Step 1: `scripts/smoke-aws.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
ALB="${1:?Usage: smoke-aws.sh <alb-hostname>}"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB}/")
[[ "$code" == "200" ]] && echo "PASS" || { echo "FAIL: $code"; exit 1; }
```

- [ ] **Step 2: Run after Argo sync**

```bash
./scripts/smoke-aws.sh k8s-boutique-xxxxx.ap-southeast-1.elb.amazonaws.com
```

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-aws.sh
git commit -m "test: add AWS ALB smoke script"
git push
```

---

## Phase 4 — Observability

### Task 4.1: CloudWatch — RDS + basic alarms

**Files:**
- Create: `infra/modules/observability-cloudwatch/main.tf`
- Modify: `infra/environments/aws/main.tf`

- [ ] **Step 1: Add CloudWatch alarms for RDS CPU > 80%, free storage < 2GB**

```hcl
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = Average
  threshold           = 80
  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}
```

- [ ] **Step 2: Apply and verify in AWS Console**

- [ ] **Step 3: Commit**

```bash
git add infra/modules/observability-cloudwatch/ infra/environments/aws/
git commit -m "feat: add CloudWatch alarms for RDS platform database"
```

---

### Task 4.2: Prometheus + Grafana (kube-prometheus-stack)

**Files:**
- Create: `observability/aws/helm-values/kube-prometheus-stack.yaml` (gitops repo)
- Modify: `clusters/aws/apps.yaml` or add second Application

- [ ] **Step 1: Add Helm values (resource limits for t3.small)**

```yaml
prometheus:
  prometheusSpec:
    retention: 2d
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
grafana:
  adminPassword: admin
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
```

> **Do not commit real admin password** — use `--set` or ESO in production; for lab regenerate each cluster.

- [ ] **Step 2: Install via Helm (document in runbook)**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n observability --create-namespace \
  -f observability/aws/helm-values/kube-prometheus-stack.yaml
```

- [ ] **Step 3: Port-forward Grafana and export dashboard JSON**

```bash
kubectl port-forward svc/monitoring-grafana -n observability 3000:80
# login admin / <password>
# Export dashboard JSON to observability/aws/dashboards/cluster-overview.json
```

- [ ] **Step 4: Add screenshot to app repo `README.md`**

- [ ] **Step 5: Commit both repos**

```bash
git add observability/
git commit -m "feat: add Prometheus/Grafana helm values and dashboard export"
```

---

## Phase 5 — Hardening & optional (defer until Phases 0–4 done)

### Task 5.1: Tighten Trivy gate (fail on CRITICAL)

**Files:**
- Modify: `.github/workflows/ci-build-push.yml`

- [ ] **Step 1: Set `exit-code: "1"` for CRITICAL only on main**

- [ ] **Step 2: Document policy in README**

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: fail build on Trivy CRITICAL vulnerabilities"
```

---

### Task 5.2: Optional — Route 53 + ACM (only if domain acquired)

**Files:**
- Create: `infra/modules/dns-acm/` (deferred)

Skip unless user purchases domain; follow spec §17.1.

---

### Task 5.3: Optional — productcatalog → PostgreSQL

Skip in default execution; see spec §11.2.

---

## Final integration — CV-ready checklist

### Task F.1: Complete README + demo checklist

**Files:**
- Modify: `README.md`
- Modify: `docs/runbooks/demo-checklist.md`

- [ ] **Step 1: Add CV bullets (English) from spec §20.2**

- [ ] **Step 2: `demo-checklist.md` script**

1. `docker compose up` → localhost:8080
2. `terraform apply` → EKS
3. Show Argo CD UI synced
4. Open ALB URL
5. Show Grafana dashboard screenshot
6. `terraform destroy`

- [ ] **Step 3: Full teardown test**

```bash
cd infra/environments/aws
terraform destroy -auto-approve
```

Expected: destroy completes; verify no EBS/ELB in console (except S3 state bucket).

- [ ] **Step 4: Final commit**

```bash
git add README.md docs/runbooks/demo-checklist.md
git commit -m "docs: finalize portfolio README and recruiter demo checklist"
git push
```

---

## Spec Coverage Self-Review

| Spec requirement | Plan task(s) |
|------------------|--------------|
| G1 Local Compose happy path | 0.3, F.1 |
| G2 Terraform AWS | 1.1–1.8 |
| G3 CI → ECR → Argo | 2.1, 3.1–3.5 |
| G4 Secrets Manager + ESO | 1.7, 3.3 |
| G5 Trivy + Checkov | 2.1, 2.2, 5.1 |
| G6 English docs + CV | 0.1, 0.4, F.1 |
| G7 Public repos | 0.4 |
| Platform RDS vs app storage | 0.3, 1.5, README disclosure |
| Ephemeral teardown | 1.9, F.1 |
| ALB HTTP no custom domain | 3.2, 1.10 |
| OIDC no long-lived keys | 1.6, 2.1 |
| Terraform plan PR only | 2.2 |
| Observability | 4.1, 4.2 |
| Success criteria §22 | F.1, 3.5 |

**Gaps:** Optional Phase 5 items (Route 53, catalog migration) intentionally deferred per spec.

**Placeholder scan:** Replace `YOUR_ORG`, `YOUR_AWS_ACCOUNT_ID`, bucket name before Task 1.8 apply.

---

## Suggested commit order (summary)

1. Phase 0: skeleton → vendor src → compose → architecture → GitHub
2. Phase 1: terraform bootstrap → modules → apply → runbooks → LBC
3. Phase 2: GitHub workflows + secrets
4. Phase 3: gitops base/overlay → ESO → Argo → smoke-aws
5. Phase 4: CloudWatch → Prometheus/Grafana → README screenshot
6. Phase 5/F: hardening + demo checklist + destroy test
