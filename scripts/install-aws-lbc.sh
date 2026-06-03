#!/usr/bin/env bash
# Task 1.10 — Install or verify AWS Load Balancer Controller on EKS
# Prereqs: terraform apply done; kubectl configured; helm required only for fresh install
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_ENV="${REPO_ROOT}/infra/environments/aws"
LABEL="app.kubernetes.io/name=aws-load-balancer-controller"
NAMESPACE="kube-system"
WAIT_SECONDS="${LBC_WAIT_SECONDS:-300}"

lbc_pods_ready() {
  local ready_count
  ready_count="$(kubectl get pods -n "${NAMESPACE}" -l "${LABEL}" \
    -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' 2>/dev/null \
    | grep -c '^True$' || true)"
  local total
  total="$(kubectl get pods -n "${NAMESPACE}" -l "${LABEL}" --no-headers 2>/dev/null | wc -l | tr -d ' ')"
  [[ "${total}" -gt 0 && "${ready_count}" -eq "${total}" ]]
}

show_lbc_status() {
  kubectl get pods -n "${NAMESPACE}" -l "${LABEL}"
}

ROLE_ARN="$(terraform -chdir="${AWS_ENV}" output -raw alb_controller_role_arn 2>/dev/null || true)"
if [[ -z "${ROLE_ARN}" ]]; then
  echo "Run terraform apply in infra/environments/aws first." >&2
  exit 1
fi

echo "Cluster: ${CLUSTER_NAME} | IRSA role: ${ROLE_ARN}"
aws eks update-kubeconfig --region "${REGION}" --name "${CLUSTER_NAME}" >/dev/null

if lbc_pods_ready; then
  echo ""
  echo "LBC pods already Ready — skipping Helm install."
  show_lbc_status
  echo ""
  echo "PASS: AWS Load Balancer Controller is Running (Task 1.10)"
  exit 0
fi

if ! command -v helm >/dev/null 2>&1; then
  echo "Helm not found in PATH. Install Helm, then re-run, e.g.:" >&2
  echo "  brew install helm   # macOS" >&2
  echo "  choco install kubernetes-helm   # Windows" >&2
  exit 1
fi

helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n "${NAMESPACE}" \
  --set clusterName="${CLUSTER_NAME}" \
  --set region="${REGION}" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=${ROLE_ARN}"

echo ""
echo "Waiting for controller pods (timeout ${WAIT_SECONDS}s)..."
kubectl wait --for=condition=ready pod -l "${LABEL}" -n "${NAMESPACE}" --timeout="${WAIT_SECONDS}s"

show_lbc_status
echo ""
echo "PASS: AWS Load Balancer Controller is Running (Task 1.10)"
