# AWS bring-up runbook

Ephemeral **prod-like** stack in `ap-southeast-1`. Tear down when finished — see [aws-down.md](aws-down.md).

## Prerequisites

- Terraform >= 1.5, AWS CLI, `kubectl`
- `helm` — required only for **first** LBC install; use `scripts/verify-aws-lbc.ps1` if Helm is not on PATH (Windows: `winget install Helm.Helm`)
- Bootstrap remote state applied (`infra/bootstrap/state`)
- `terraform.tfvars` configured in `infra/environments/aws`
- `terraform.tfvars` matches your GitHub org/repo and AWS account (see `terraform.tfvars.example`)

### EKS API security (demo)

The cluster uses a **public Kubernetes API endpoint** so `kubectl` works from your laptop. By default all CIDRs (`0.0.0.0/0`) can reach it. For safer demos, set in `terraform.tfvars`:

```hcl
cluster_endpoint_public_access_cidrs = ["YOUR_PUBLIC_IP/32"]
```

Re-apply after changing. Private endpoint remains enabled for in-VPC access.

## 1. Apply infrastructure

```bash
cd infra/environments/aws
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan
```

Record outputs: `eks_cluster_name`, `ecr_repository_urls`, `alb_controller_role_arn`, `external_secrets_role_arn`, `rds_endpoint`.

## 2. Configure kubectl

```bash
aws eks update-kubeconfig \
  --region ap-southeast-1 \
  --name mini-ecommerce-devops
kubectl get nodes
```

Expected: one node in `Ready` state.

## 3. Install AWS Load Balancer Controller (Task 1.10)

**IAM:** Terraform module `infra/modules/iam-irsa` already attaches the AWS Load Balancer Controller policy via IRSA (`attach_load_balancer_controller_policy = true`). No extra IAM JSON download needed.

**Helm (script):** Skips install if controller pods are already `Ready`.

```powershell
.\scripts\install-aws-lbc.ps1
# or verify only (no Helm):
.\scripts\verify-aws-lbc.ps1
```

```bash
chmod +x scripts/install-aws-lbc.sh scripts/verify-aws-lbc.sh
./scripts/install-aws-lbc.sh
# or verify only:
./scripts/verify-aws-lbc.sh
```

**Helm (manual):**

```bash
cd infra/environments/aws
ROLE_ARN=$(terraform output -raw alb_controller_role_arn)
aws eks update-kubeconfig --region ap-southeast-1 --name mini-ecommerce-devops

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=mini-ecommerce-devops \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${ROLE_ARN}"
```

Verify:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

Expected: pods `Running`.

## 4. Install External Secrets Operator

**Prerequisite:** EKS workers should use **`m7i-flex.large`** (or similar) so Argo CD + app + ESO fit on one node — see `eks_instance_types` in `terraform.tfvars`.

```powershell
.\scripts\install-eso.ps1
```

```bash
./scripts/install-eso.sh
```

**Manual (Helm):**

```bash
cd infra/environments/aws
ESO_ROLE_ARN=$(terraform output -raw external_secrets_role_arn)
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${ESO_ROLE_ARN}"
```

`ClusterSecretStore` + `ExternalSecret` for RDS are in the GitOps AWS overlay — synced by Argo CD in step 5.

## 5. Install Argo CD and sync GitOps

```powershell
.\scripts\install-argocd.ps1
```

```bash
./scripts/install-argocd.sh
```

**Manual:** Helm install + apply manifests from [mini-ecommerce-gitops](https://github.com/VoAnhKiet1410/mini-ecommerce-gitops) `clusters/aws/`.

Wait for sync:

```bash
kubectl get application online-boutique -n argocd
kubectl get pods -n boutique
kubectl get clustersecretstore aws-secretsmanager
kubectl get externalsecret -n boutique
```

**Prerequisite:** ECR images tagged `latest` for `frontend`, `productcatalogservice`, `cartservice`, `checkoutservice` (run CI on `main` after Terraform apply).

## 6. Verify Phase 3 (ALB smoke + GitOps)

```powershell
.\scripts\verify-phase3.ps1
```

```bash
ALB=$(kubectl get ingress frontend-ingress -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
./scripts/smoke-aws.sh "$ALB"
```

## 7. Platform database

RDS is provisioned as a **platform database**. Application pods use Redis/in-memory per upstream; ESO syncs RDS credentials for future use.
