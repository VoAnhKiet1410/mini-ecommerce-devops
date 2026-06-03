# Task 1.10 - Install or verify AWS Load Balancer Controller on EKS
# Prereqs: terraform apply done; kubectl configured; helm required only for fresh install

$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$RepoRoot = Split-Path $PSScriptRoot -Parent
$AwsEnv = Join-Path $RepoRoot "infra\environments\aws"
$Label = "app.kubernetes.io/name=aws-load-balancer-controller"
$Namespace = "kube-system"
$WaitSeconds = 300

function Resolve-Helm {
    $cmd = Get-Command helm -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Helm.Helm_Microsoft.Winget.Source_8wekyb3d8bbwe\windows-amd64\helm.exe",
        "$env:USERPROFILE\.local\bin\helm.exe",
        "$env:ProgramFiles\helm\windows-amd64\helm.exe",
        "C:\ProgramData\chocolatey\bin\helm.exe",
        "C:\Program Files\helm\helm.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Test-LbcPodsReady {
    $json = kubectl get pods -n $Namespace -l $Label -o json 2>$null
    if (-not $json) { return $false }
    $pods = ($json | ConvertFrom-Json).items
    if (-not $pods -or $pods.Count -eq 0) { return $false }
    foreach ($pod in $pods) {
        $ready = $false
        foreach ($cond in $pod.status.conditions) {
            if ($cond.type -eq "Ready" -and $cond.status -eq "True") { $ready = $true }
        }
        if (-not $ready) { return $false }
    }
    return $true
}

function Show-LbcStatus {
    kubectl get pods -n $Namespace -l $Label
}

Push-Location $AwsEnv
try {
    $RoleArn = terraform output -raw alb_controller_role_arn 2>$null
    if (-not $RoleArn) {
        Write-Error "Run terraform apply in infra/environments/aws first."
    }
} finally {
    Pop-Location
}

Write-Host "Cluster: $ClusterName | IRSA role: $RoleArn"
aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

if (Test-LbcPodsReady) {
    Write-Host "`nLBC pods already Ready - skipping Helm install."
    Show-LbcStatus
    Write-Host "`nPASS: AWS Load Balancer Controller is Running (Task 1.10)"
    exit 0
}

$helmPath = Resolve-Helm
if (-not $helmPath) {
    Write-Error @"
Helm not found in PATH. Install Helm, then re-run this script, e.g.:
  winget install Helm.Helm
  choco install kubernetes-helm
Or verify only (if LBC was installed elsewhere):
  kubectl get pods -n $Namespace -l $Label
"@
}

Write-Host "Using helm: $helmPath"
& $helmPath repo add eks https://aws.github.io/eks-charts 2>$null
& $helmPath repo update

& $helmPath upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller `
  -n $Namespace `
  --set clusterName=$ClusterName `
  --set region=$Region `
  --set serviceAccount.create=true `
  --set serviceAccount.name=aws-load-balancer-controller `
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=$RoleArn"

Write-Host "`nWaiting for controller pods (timeout ${WaitSeconds}s)..."
kubectl wait --for=condition=ready pod -l $Label -n $Namespace --timeout="${WaitSeconds}s"

Show-LbcStatus
Write-Host "`nPASS: AWS Load Balancer Controller is Running (Task 1.10)"
