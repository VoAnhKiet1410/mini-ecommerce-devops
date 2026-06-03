# Phase 3 - Install Argo CD and bootstrap GitOps Application
$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$GitOpsBase = "https://raw.githubusercontent.com/VoAnhKiet1410/mini-ecommerce-gitops/main"
$Namespace = "argocd"
$WaitSeconds = 600

function Resolve-Helm {
    $cmd = Get-Command helm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Helm.Helm_Microsoft.Winget.Source_8wekyb3d8bbwe\windows-amd64\helm.exe",
        "$env:USERPROFILE\.local\bin\helm.exe",
        "$env:ProgramFiles\helm\windows-amd64\helm.exe",
        "C:\ProgramData\chocolatey\bin\helm.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

$helmPath = Resolve-Helm
if (-not $helmPath) { Write-Error "Helm not found. Install: winget install Helm.Helm" }

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

& $helmPath repo add argo https://argoproj.github.io/argo-helm 2>$null
& $helmPath repo update

& $helmPath upgrade --install argocd argo/argo-cd -n $Namespace --create-namespace `
  --set applicationSet.enabled=false `
  --set notifications.enabled=false `
  --set server.replicas=1 `
  --set controller.replicas=1 `
  --set repoServer.replicas=1

Write-Host "Waiting for argocd-server (timeout ${WaitSeconds}s)..."
kubectl wait --for=condition=available deployment/argocd-server -n $Namespace --timeout="${WaitSeconds}s"

kubectl apply -f "$GitOpsBase/clusters/aws/project.yaml"
kubectl apply -f "$GitOpsBase/clusters/aws/apps.yaml"

Write-Host "Waiting for Application sync..."
$deadline = (Get-Date).AddSeconds($WaitSeconds)
do {
    $status = kubectl get application online-boutique -n $Namespace -o jsonpath='{.status.sync.status}' 2>$null
    $health = kubectl get application online-boutique -n $Namespace -o jsonpath='{.status.health.status}' 2>$null
    if ($status -eq "Synced" -and $health -eq "Healthy") { break }
    Start-Sleep -Seconds 10
} while ((Get-Date) -lt $deadline)

kubectl get application online-boutique -n $Namespace
kubectl get pods -n boutique
Write-Host "`nPASS: Argo CD installed and online-boutique Application synced"
