#!/usr/bin/env bash
# Task 1.10 verification — kubectl only (no Helm required)
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
LABEL="app.kubernetes.io/name=aws-load-balancer-controller"

aws eks update-kubeconfig --region "${REGION}" --name "${CLUSTER_NAME}" >/dev/null
kubectl get pods -n kube-system -l "${LABEL}"

ready_count="$(kubectl get pods -n kube-system -l "${LABEL}" \
  -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' \
  | grep -c '^True$' || true)"
total="$(kubectl get pods -n kube-system -l "${LABEL}" --no-headers | wc -l | tr -d ' ')"

if [[ "${total}" -eq 0 || "${ready_count}" -ne "${total}" ]]; then
  echo "FAIL: AWS Load Balancer Controller pods not all Ready (${ready_count}/${total})" >&2
  exit 1
fi

echo "PASS: Task 1.10 — AWS Load Balancer Controller pods Ready (${total} pod(s))"
