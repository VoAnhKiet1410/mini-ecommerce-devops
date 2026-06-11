#!/usr/bin/env bash
# Verify cosign keyless signature + SBOM attestation of an ECR image.
# Requires: aws CLI (authenticated), cosign.
# Usage: verify-image-signature.sh [service] [tag]
set -euo pipefail

SERVICE="${1:-frontend}"
TAG="${2:-latest}"
REGION="${AWS_REGION:-ap-southeast-1}"
GITHUB_ORG="${GITHUB_ORG:-VoAnhKiet1410}"
GITHUB_REPO="${GITHUB_REPO:-mini-ecommerce-devops}"

command -v cosign >/dev/null || { echo "FAIL: cosign not found (https://docs.sigstore.dev/cosign/system_config/installation/)"; exit 1; }

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
REPO_NAME="mini-ecommerce/${SERVICE}"

echo "Logging cosign into ${REGISTRY}..."
aws ecr get-login-password --region "$REGION" | cosign login --username AWS --password-stdin "$REGISTRY"

echo "Resolving digest for ${REPO_NAME}:${TAG}..."
DIGEST=$(aws ecr describe-images --region "$REGION" --repository-name "$REPO_NAME" \
  --image-ids imageTag="$TAG" --query 'imageDetails[0].imageDigest' --output text)
[[ -n "$DIGEST" && "$DIGEST" != "None" ]] || { echo "FAIL: image ${REPO_NAME}:${TAG} not found in ECR"; exit 1; }
IMAGE="${REGISTRY}/${REPO_NAME}@${DIGEST}"
echo "Image: ${IMAGE}"
echo

IDENTITY_REGEXP="^https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/"
ISSUER="https://token.actions.githubusercontent.com"

echo "=== cosign verify (signature) ==="
cosign verify "$IMAGE" \
  --certificate-identity-regexp "$IDENTITY_REGEXP" \
  --certificate-oidc-issuer "$ISSUER"

echo
echo "=== cosign verify-attestation (SBOM, SPDX JSON) ==="
cosign verify-attestation "$IMAGE" --type spdxjson \
  --certificate-identity-regexp "$IDENTITY_REGEXP" \
  --certificate-oidc-issuer "$ISSUER" >/dev/null

echo
echo "PASS: ${REPO_NAME}:${TAG} is signed by GitHub Actions (${GITHUB_ORG}/${GITHUB_REPO}) and has a verified SBOM attestation"
