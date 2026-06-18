#!/usr/bin/env bash
# Install Kyverno on EKS and apply the boutique image-verification policy.
# Idempotent: skips Helm install if Kyverno pods are already Running.
#
# Usage:
#   ./scripts/install-kyverno.sh
#   ./scripts/install-kyverno.sh --audit-only       # deploy policy in Audit mode (no blocking)
#   ./scripts/install-kyverno.sh --skip-ecr-secret  # skip ECR image-pull secret creation
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER="${EKS_CLUSTER_NAME:-mini-ecommerce-devops}"
KYVERNO_NS="kyverno"
POLICY_FILE="$(dirname "$0")/../infra/kyverno/boutique-verify-images.yaml"

AUDIT_ONLY=false
SKIP_ECR_SECRET=false
for arg in "$@"; do
  case $arg in
    --audit-only)       AUDIT_ONLY=true ;;
    --skip-ecr-secret)  SKIP_ECR_SECRET=true ;;
  esac
done

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER" >/dev/null

# ── 1. Install Kyverno via Helm (skip if already present) ──────────────────
if kubectl get pods -n "$KYVERNO_NS" --no-headers 2>/dev/null | grep -q Running; then
  echo "Kyverno pods already Running — skipping Helm install."
else
  echo "Installing Kyverno..."
  helm repo add kyverno https://kyverno.github.io/kyverno/ 2>/dev/null || true
  helm repo update kyverno
  helm upgrade --install kyverno kyverno/kyverno \
    --namespace "$KYVERNO_NS" --create-namespace \
    --version "3.4.4" \
    --set admissionController.replicas=1 \
    --set backgroundController.enabled=false \
    --set cleanupController.enabled=false \
    --set reportsController.enabled=false \
    --wait --timeout 5m
  echo "Kyverno installed."
fi

# ── 2. Create ECR image-pull secret for Kyverno (token valid 12 h) ─────────
if [ "$SKIP_ECR_SECRET" = "false" ]; then
  echo "Creating ECR pull secret for Kyverno..."
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
  TOKEN=$(aws ecr get-login-password --region "$REGION")

  kubectl create secret docker-registry ecr-pull-secret \
    --docker-server="$REGISTRY" \
    --docker-username=AWS \
    --docker-password="$TOKEN" \
    --namespace "$KYVERNO_NS" \
    --dry-run=client -o yaml | kubectl apply -f -

  echo "ECR pull secret created (valid 12 h — re-run script to refresh)."
else
  echo "Skipping ECR secret creation (--skip-ecr-secret)."
fi

# ── 3. Apply the policy ─────────────────────────────────────────────────────
if [ "$AUDIT_ONLY" = "true" ]; then
  echo "Applying policy in Audit mode..."
  sed 's/validationFailureAction: Enforce/validationFailureAction: Audit/' "$POLICY_FILE" | kubectl apply -f -
else
  echo "Applying policy in Enforce mode..."
  kubectl apply -f "$POLICY_FILE"
fi

# ── 4. Verify ──────────────────────────────────────────────────────────────
echo ""
echo "=== Kyverno pods ==="
kubectl get pods -n "$KYVERNO_NS"

echo ""
echo "=== ClusterPolicy ==="
kubectl get clusterpolicy verify-boutique-images

echo ""
echo "PASS: Kyverno installed; boutique image verification policy applied."
echo "Note: ECR pull secret expires in 12 h. Re-run ./scripts/install-kyverno.sh to refresh."
