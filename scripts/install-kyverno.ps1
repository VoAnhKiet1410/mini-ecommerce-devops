#Requires -Version 5.1
# Install Kyverno on EKS and apply the boutique image-verification policy.
# Idempotent: skips Helm install if Kyverno pods are already Running.
#
# Usage:
#   .\scripts\install-kyverno.ps1
#   .\scripts\install-kyverno.ps1 -AuditOnly        # deploy policy in Audit mode (no blocking)
#   .\scripts\install-kyverno.ps1 -SkipEcrSecret    # skip ECR image-pull secret creation
$ErrorActionPreference = "Stop"

param(
    [switch]$AuditOnly,
    [switch]$SkipEcrSecret
)

$Region      = if ($env:AWS_REGION)      { $env:AWS_REGION }      else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME){ $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$KyvernoNs   = "kyverno"
$PolicyFile  = "$PSScriptRoot\..\infra\kyverno\boutique-verify-images.yaml"

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

# ── 1. Install Kyverno via Helm (skip if already present) ──────────────────
$existing = kubectl get pods -n $KyvernoNs --no-headers 2>$null |
            Where-Object { $_ -match "Running" }
if ($existing) {
    Write-Host "Kyverno pods already Running — skipping Helm install."
} else {
    Write-Host "Installing Kyverno..."
    helm repo add kyverno https://kyverno.github.io/kyverno/ 2>$null
    helm repo update kyverno
    helm upgrade --install kyverno kyverno/kyverno `
        --namespace $KyvernoNs --create-namespace `
        --version "3.4.4" `
        --set admissionController.replicas=1 `
        --set backgroundController.enabled=false `
        --set cleanupController.enabled=false `
        --set reportsController.enabled=false `
        --wait --timeout 5m
    Write-Host "Kyverno installed."
}

# ── 2. Create ECR image-pull secret for Kyverno (token valid 12 h) ─────────
# Kyverno needs to pull image signatures (OCI artifacts) from ECR to verify them.
# Note: ECR tokens expire after 12 hours. For production, use IRSA instead.
if (-not $SkipEcrSecret) {
    Write-Host "Creating ECR pull secret for Kyverno..."
    $accountId = (aws sts get-caller-identity --query Account --output text)
    $registry  = "${accountId}.dkr.ecr.${Region}.amazonaws.com"
    $token     = (aws ecr get-login-password --region $Region)

    kubectl create secret docker-registry ecr-pull-secret `
        --docker-server="$registry" `
        --docker-username=AWS `
        --docker-password="$token" `
        --namespace $KyvernoNs `
        --dry-run=client -o yaml | kubectl apply -f -

    Write-Host "ECR pull secret created (valid 12 h — re-run script to refresh)."
} else {
    Write-Host "Skipping ECR secret creation (-SkipEcrSecret)."
}

# ── 3. Apply the policy ─────────────────────────────────────────────────────
$policyContent = Get-Content $PolicyFile -Raw

if ($AuditOnly) {
    Write-Host "Applying policy in Audit mode..."
    $policyContent = $policyContent -replace "validationFailureAction: Enforce", "validationFailureAction: Audit"
    $policyContent | kubectl apply -f -
} else {
    Write-Host "Applying policy in Enforce mode..."
    kubectl apply -f $PolicyFile
}

# ── 4. Verify ──────────────────────────────────────────────────────────────
Write-Host "`n=== Kyverno pods ==="
kubectl get pods -n $KyvernoNs

Write-Host "`n=== ClusterPolicy ==="
kubectl get clusterpolicy verify-boutique-images

Write-Host "`nPASS: Kyverno installed; boutique image verification policy applied."
Write-Host "Note: ECR pull secret expires in 12 h. Re-run .\scripts\install-kyverno.ps1 to refresh."
