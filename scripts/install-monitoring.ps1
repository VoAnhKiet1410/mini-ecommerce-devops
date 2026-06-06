# Phase 4 - Install kube-prometheus-stack (Prometheus + Grafana)
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$DotEnv = Join-Path $RepoRoot ".env"
if ((Test-Path $DotEnv) -and -not $env:GRAFANA_ADMIN_PASSWORD) {
    Get-Content $DotEnv | ForEach-Object {
        if ($_ -match '^\s*GRAFANA_ADMIN_PASSWORD\s*=\s*(.+)\s*$') {
            $env:GRAFANA_ADMIN_PASSWORD = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$ValuesFile = Join-Path $RepoRoot "observability\aws\helm-values\kube-prometheus-stack.yaml"
$Namespace = "observability"
$ReleaseName = "monitoring"
$WaitSeconds = 600
$GrafanaPassword = if ($env:GRAFANA_ADMIN_PASSWORD) { $env:GRAFANA_ADMIN_PASSWORD } else { "admin" }

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

if (-not (Test-Path $ValuesFile)) {
    Write-Error "Missing values file: $ValuesFile"
}

$helmPath = Resolve-Helm
if (-not $helmPath) { Write-Error "Helm not found. Install: winget install Helm.Helm" }

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

& $helmPath repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>$null
& $helmPath repo update

& $helmPath upgrade --install $ReleaseName prometheus-community/kube-prometheus-stack `
  -n $Namespace --create-namespace `
  -f $ValuesFile `
  --set "grafana.adminPassword=$GrafanaPassword" `
  --wait --timeout "${WaitSeconds}s"

Write-Host "Waiting for Grafana deployment..."
kubectl wait --for=condition=available deployment/$ReleaseName-grafana -n $Namespace --timeout="${WaitSeconds}s"

kubectl get pods -n $Namespace
Write-Host "`nGrafana (port-forward):"
Write-Host "  kubectl port-forward svc/$ReleaseName-grafana -n $Namespace 3000:80"
Write-Host "  http://localhost:3000  user=admin  password=<GRAFANA_ADMIN_PASSWORD or default admin>"
Write-Host "`nImport dashboard JSON: observability/aws/dashboards/cluster-overview.json"
Write-Host "PASS: kube-prometheus-stack installed"
