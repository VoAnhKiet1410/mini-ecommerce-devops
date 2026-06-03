# Phase 3 verification: ESO, Argo sync, boutique pods, ALB smoke
$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

Write-Host "=== ESO ==="
kubectl get pods -n external-secrets
kubectl get clustersecretstore aws-secretsmanager 2>$null
kubectl get externalsecret -n boutique 2>$null

Write-Host "`n=== Argo CD ==="
$sync = kubectl get application online-boutique -n argocd -o jsonpath='{.status.sync.status}' 2>$null
$health = kubectl get application online-boutique -n argocd -o jsonpath='{.status.health.status}' 2>$null
Write-Host "Application online-boutique: sync=$sync health=$health"
if ($sync -ne "Synced" -or $health -ne "Healthy") {
    Write-Error "Argo Application not Synced/Healthy"
}

Write-Host "`n=== Boutique ==="
kubectl get pods -n boutique
$alb = kubectl get ingress frontend-ingress -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
if (-not $alb) { Write-Error "No ALB hostname on boutique ingress" }
Write-Host "ALB: $alb"

& "$PSScriptRoot\smoke-aws.ps1" -AlbHostname $alb
Write-Host "`nPASS: Phase 3 verification complete"
