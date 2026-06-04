#!/usr/bin/env bash
# Phase 4 - Install kube-prometheus-stack (Prometheus + Grafana)
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VALUES_FILE="${REPO_ROOT}/observability/aws/helm-values/kube-prometheus-stack.yaml"
NAMESPACE="observability"
RELEASE_NAME="monitoring"
WAIT_SECONDS="${MONITORING_WAIT_SECONDS:-600}"
GRAFANA_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin}"

if [[ ! -f "$VALUES_FILE" ]]; then
  echo "Missing values file: $VALUES_FILE" >&2
  exit 1
fi

command -v helm >/dev/null || { echo "Helm required. See docs/runbooks/observability.md" >&2; exit 1; }

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update

helm upgrade --install "$RELEASE_NAME" prometheus-community/kube-prometheus-stack \
  -n "$NAMESPACE" --create-namespace \
  -f "$VALUES_FILE" \
  --set "grafana.adminPassword=${GRAFANA_PASSWORD}" \
  --wait --timeout "${WAIT_SECONDS}s"

kubectl wait --for=condition=available "deployment/${RELEASE_NAME}-grafana" -n "$NAMESPACE" --timeout="${WAIT_SECONDS}s"
kubectl get pods -n "$NAMESPACE"

echo ""
echo "Grafana (port-forward):"
echo "  kubectl port-forward svc/${RELEASE_NAME}-grafana -n ${NAMESPACE} 3000:80"
echo "  http://localhost:3000  user=admin  password=\${GRAFANA_ADMIN_PASSWORD:-admin}"
echo ""
echo "Import dashboard: observability/aws/dashboards/cluster-overview.json"
echo "PASS: kube-prometheus-stack installed"
