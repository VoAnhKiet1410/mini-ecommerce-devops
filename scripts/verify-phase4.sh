#!/usr/bin/env bash
# Phase 4 verification: CloudWatch RDS/ALB alarms + kube-prometheus-stack (Grafana)
set -euo pipefail

SKIP_MONITORING=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-monitoring) SKIP_MONITORING=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="${REPO_ROOT}/infra/environments/aws"
RELEASE_NAME="monitoring"
NAMESPACE="observability"

tf_output_json() {
  local name="$1"
  (cd "$TF_DIR" && terraform output -json "$name" 2>/dev/null) || echo "[]"
}

check_alarm() {
  local alarm_name="$1"
  local state
  state="$(aws cloudwatch describe-alarms \
    --region "$REGION" \
    --alarm-names "$alarm_name" \
    --query 'MetricAlarms[0].StateValue' \
    --output text 2>/dev/null || true)"
  if [[ -z "$state" || "$state" == "None" ]]; then
    echo "CloudWatch alarm not found: $alarm_name" >&2
    exit 1
  fi
  echo "  alarm ${alarm_name} : ${state}"
}

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME" >/dev/null

echo "=== CloudWatch — RDS alarms ==="
mapfile -t rds_alarms < <(tf_output_json cloudwatch_rds_alarm_names | jq -r '.[]')
if [[ "${#rds_alarms[@]}" -lt 2 ]]; then
  echo "Expected 2 RDS alarm names from terraform output" >&2
  exit 1
fi
for name in "${rds_alarms[@]}"; do
  check_alarm "$name"
done

echo ""
echo "=== CloudWatch — ALB alarms ==="
mapfile -t alb_alarms < <(tf_output_json cloudwatch_alb_alarm_names | jq -r '.[]')
ingress_host="$(kubectl get ingress frontend-ingress -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"

if [[ "${#alb_alarms[@]}" -eq 0 ]]; then
  if [[ -n "$ingress_host" ]]; then
    echo "WARN: No ALB alarms in state but ingress ALB exists: ${ingress_host}" >&2
    echo "Re-run terraform apply from infra/environments/aws after Phase 3 ingress." >&2
  else
    echo "  (no ALB ingress yet — skip ALB alarm check)"
  fi
else
  for name in "${alb_alarms[@]}"; do
    check_alarm "$name"
  done
fi

if [[ "$SKIP_MONITORING" == "true" ]]; then
  echo ""
  echo "PASS: Phase 4 CloudWatch verification complete (monitoring skipped)"
  exit 0
fi

echo ""
echo "=== Prometheus / Grafana ==="
kubectl get namespace "$NAMESPACE" >/dev/null
kubectl get pods -n "$NAMESPACE"
kubectl wait --for=condition=available "deployment/${RELEASE_NAME}-grafana" -n "$NAMESPACE" --timeout=300s

echo ""
echo "Grafana UI: kubectl port-forward svc/${RELEASE_NAME}-grafana -n ${NAMESPACE} 3000:80"
echo "Import dashboard: observability/aws/dashboards/cluster-overview.json"
echo ""
echo "PASS: Phase 4 verification complete"
