#!/usr/bin/env bash
set -euo pipefail
REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
GITOPS_BASE="https://raw.githubusercontent.com/VoAnhKiet1410/mini-ecommerce-gitops/main"
NAMESPACE="argocd"

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update
helm upgrade --install argocd argo/argo-cd -n "$NAMESPACE" --create-namespace \
  --set applicationSet.enabled=false \
  --set notifications.enabled=false \
  --set server.replicas=1 \
  --set controller.replicas=1 \
  --set repoServer.replicas=1

kubectl wait --for=condition=available deployment/argocd-server -n "$NAMESPACE" --timeout=600s
kubectl apply -f "$GITOPS_BASE/clusters/aws/project.yaml"
kubectl apply -f "$GITOPS_BASE/clusters/aws/apps.yaml"

deadline=$((SECONDS + 600))
while [[ $SECONDS -lt $deadline ]]; do
  status=$(kubectl get application online-boutique -n "$NAMESPACE" -o jsonpath='{.status.sync.status}' 2>/dev/null || true)
  health=$(kubectl get application online-boutique -n "$NAMESPACE" -o jsonpath='{.status.health.status}' 2>/dev/null || true)
  if [[ "$status" == "Synced" && "$health" == "Healthy" ]]; then break; fi
  sleep 10
done

kubectl get application online-boutique -n "$NAMESPACE"
kubectl get pods -n boutique
echo "PASS: Argo CD installed and online-boutique Application synced"
