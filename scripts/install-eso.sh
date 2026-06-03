#!/usr/bin/env bash
set -euo pipefail
REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AWS_ENV="$REPO_ROOT/infra/environments/aws"
NAMESPACE="external-secrets"

ROLE_ARN="$(terraform -chdir="$AWS_ENV" output -raw external_secrets_role_arn)"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

helm repo add external-secrets https://charts.external-secrets.io 2>/dev/null || true
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n "$NAMESPACE" --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${ROLE_ARN}"

kubectl wait --for=condition=available deployment/external-secrets -n "$NAMESPACE" --timeout=300s
kubectl wait --for=condition=available deployment/external-secrets-webhook -n "$NAMESPACE" --timeout=300s
kubectl get pods -n "$NAMESPACE"
echo "PASS: External Secrets Operator is Running"
