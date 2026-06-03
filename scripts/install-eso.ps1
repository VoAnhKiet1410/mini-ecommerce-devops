# Phase 3 - Install External Secrets Operator with IRSA
$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$RepoRoot = Split-Path $PSScriptRoot -Parent
$AwsEnv = Join-Path $RepoRoot "infra\environments\aws"
$Namespace = "external-secrets"
$WaitSeconds = 300

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

Push-Location $AwsEnv
try {
    $RoleArn = terraform output -raw external_secrets_role_arn 2>$null
    if (-not $RoleArn) { Write-Error "Run terraform apply in infra/environments/aws first." }
} finally {
    Pop-Location
}

$helmPath = Resolve-Helm
if (-not $helmPath) { Write-Error "Helm not found. Install: winget install Helm.Helm" }

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

& $helmPath repo add external-secrets https://charts.external-secrets.io 2>$null
& $helmPath repo update

& $helmPath upgrade --install external-secrets external-secrets/external-secrets `
  -n $Namespace --create-namespace `
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=$RoleArn"

Write-Host "Waiting for ESO pods (timeout ${WaitSeconds}s)..."
kubectl wait --for=condition=available deployment/external-secrets -n $Namespace --timeout="${WaitSeconds}s"
kubectl wait --for=condition=available deployment/external-secrets-webhook -n $Namespace --timeout="${WaitSeconds}s"
kubectl get pods -n $Namespace
Write-Host "`nPASS: External Secrets Operator is Running"
