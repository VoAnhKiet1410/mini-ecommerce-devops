# AWS bring-up runbook

Ephemeral **prod-like** stack in `ap-southeast-1`. Tear down when finished — see [aws-down.md](aws-down.md).

## Prerequisites

- Terraform >= 1.5, AWS CLI, `kubectl`, `helm`
- Bootstrap remote state applied (`infra/bootstrap/state`)
- `terraform.tfvars` configured in `infra/environments/aws`
- Configured for GitHub `VoAnhKiet1410`, AWS account `962765735385`, CLI profile `default`

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

## 3. Install AWS Load Balancer Controller

Download the IAM policy JSON for [AWS Load Balancer Controller v2.7+](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/deploy/installation/) if not fully covered by Terraform IRSA.

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=mini-ecommerce-devops \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::962765735385:role/mini-ecommerce-devops-alb-controller
```

Replace the role ARN with `terraform output alb_controller_role_arn`.

Verify:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

Expected: pods `Running`.

## 4. Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::962765735385:role/mini-ecommerce-devops-external-secrets
```

Configure `ClusterSecretStore` for AWS Secrets Manager (Phase 3).

## 5. Install Argo CD

```bash
kubectl create namespace argocd
helm repo add argo https://argoproj.github.io/argo-helm
helm upgrade --install argocd argo/argo-cd -n argocd
```

Register the GitOps repo and apply `clusters/aws/apps.yaml` after **Phase 3**.

## 6. Verify application ingress

```bash
kubectl get ingress -n boutique
```

Note the ALB hostname, then:

```bash
curl -I "http://<alb-host>/"
```

Expected: HTTP response from frontend (after GitOps sync).

## 7. Platform database

RDS is provisioned as a **platform database**. Application pods use Redis/in-memory per upstream; ESO syncs RDS credentials for future use.
