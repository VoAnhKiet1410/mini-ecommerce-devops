# Phase 4 end-to-end: infra (optional) -> Phase 3 check -> ALB alarms re-apply -> monitoring -> screenshot -> verify
param(
    [switch]$ApplyInfra,
    [switch]$SkipBootstrap,
    [switch]$SkipPhase3,
    [switch]$SkipScreenshot,
    [string]$GrafanaPassword = $(if ($env:GRAFANA_ADMIN_PASSWORD) { $env:GRAFANA_ADMIN_PASSWORD } else { "admin" })
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$BootstrapDir = Join-Path $RepoRoot "infra\bootstrap\state"
$TfDir = Join-Path $RepoRoot "infra\environments\aws"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }

function Test-EksCluster {
    try {
        $status = aws eks describe-cluster --region $Region --name $ClusterName --query "cluster.status" --output text 2>$null
        return $status -eq "ACTIVE"
    } catch {
        return $false
    }
}

function Invoke-TerraformApply {
    param([string]$Directory)
    Push-Location $Directory
    try {
        if (-not (Test-Path ".terraform")) {
            if ($Directory -eq $TfDir) {
                terraform init "-backend-config=backend.hcl" | Write-Host
            } else {
                terraform init | Write-Host
            }
        }
        terraform plan -out=tfplan -input=false | Write-Host
        terraform apply -input=false tfplan | Write-Host
    } finally {
        Pop-Location
    }
}

$clusterExists = Test-EksCluster
if (-not $clusterExists) {
    if (-not $ApplyInfra) {
        Write-Error @"
EKS cluster '$ClusterName' not found. Re-run with -ApplyInfra to bootstrap and apply Terraform (costs AWS resources).
Example: .\scripts\run-phase4-e2e.ps1 -ApplyInfra
"@
    }
    if (-not $SkipBootstrap) {
        Write-Host "=== Bootstrap remote state ==="
        Invoke-TerraformApply -Directory $BootstrapDir
    }
    Write-Host "=== Apply AWS environment ==="
    Invoke-TerraformApply -Directory $TfDir
    aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null
    Write-Host "=== Install AWS LBC ==="
    & "$PSScriptRoot\install-aws-lbc.ps1"
    if (-not $SkipPhase3) {
        Write-Host "=== Phase 3: ESO + Argo CD ==="
        & "$PSScriptRoot\install-eso.ps1"
        & "$PSScriptRoot\install-argocd.ps1"
        Write-Host "Wait for Argo sync (up to 10 min)..."
        $deadline = (Get-Date).AddMinutes(10)
        do {
            Start-Sleep -Seconds 15
            $sync = kubectl get application online-boutique -n argocd -o jsonpath='{.status.sync.status}' 2>$null
            $health = kubectl get application online-boutique -n argocd -o jsonpath='{.status.health.status}' 2>$null
            Write-Host "  sync=$sync health=$health"
        } while (((Get-Date) -lt $deadline) -and ($sync -ne "Synced" -or $health -ne "Healthy"))
        & "$PSScriptRoot\verify-phase3.ps1"
    }
} else {
    aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null
    if (-not $SkipPhase3) {
        & "$PSScriptRoot\verify-phase3.ps1"
    }
}

Write-Host "=== Re-apply Terraform (ALB CloudWatch alarms) ==="
Invoke-TerraformApply -Directory $TfDir

$env:GRAFANA_ADMIN_PASSWORD = $GrafanaPassword
Write-Host "=== Install monitoring stack ==="
& "$PSScriptRoot\install-monitoring.ps1"

if (-not $SkipScreenshot) {
    Write-Host "=== Capture Grafana screenshot for README ==="
    & "$PSScriptRoot\capture-grafana-screenshot.ps1" -GrafanaPassword $GrafanaPassword
}

Write-Host "=== Verify Phase 4 ==="
& "$PSScriptRoot\verify-phase4.ps1"

Write-Host "`nPASS: Phase 4 E2E complete"
