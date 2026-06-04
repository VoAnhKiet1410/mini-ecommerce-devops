# Import cluster-overview dashboard via Grafana API and save a PNG for README (requires port-forward).
param(
    [string]$GrafanaPassword = $(if ($env:GRAFANA_ADMIN_PASSWORD) { $env:GRAFANA_ADMIN_PASSWORD } else { "admin" }),
    [int]$LocalPort = 3000,
    [int]$WaitSeconds = 120
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$DashboardJson = Join-Path $RepoRoot "observability\aws\dashboards\cluster-overview.json"
$OutDir = Join-Path $RepoRoot "docs\assets"
$OutFile = Join-Path $OutDir "grafana-cluster-overview.png"
$Namespace = "observability"
$ReleaseName = "monitoring"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }

if (-not (Test-Path $DashboardJson)) {
    Write-Error "Missing dashboard JSON: $DashboardJson"
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null
kubectl wait --for=condition=available "deployment/${ReleaseName}-grafana" -n $Namespace --timeout="${WaitSeconds}s"

$pf = Start-Job -ScriptBlock {
    param($Ns, $Rel, $Port)
    kubectl port-forward "svc/${Rel}-grafana" -n $Ns "${Port}:80" 2>&1
} -ArgumentList $Namespace, $ReleaseName, $LocalPort

try {
    $base = "http://127.0.0.1:${LocalPort}"
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:${GrafanaPassword}"))
    $headers = @{ Authorization = "Basic $auth" }

    $ready = $false
    foreach ($i in 1..60) {
        try {
            Invoke-RestMethod -Uri "$base/api/health" -Headers $headers -TimeoutSec 3 | Out-Null
            $ready = $true
            break
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    if (-not $ready) { Write-Error "Grafana not reachable on $base" }

    $body = Get-Content $DashboardJson -Raw | ConvertFrom-Json
    $import = @{
        dashboard = $body
        overwrite = $true
        inputs    = @()
    } | ConvertTo-Json -Depth 20 -Compress
    Invoke-RestMethod -Method Post -Uri "$base/api/dashboards/db" -Headers $headers `
        -ContentType "application/json" -Body $import | Out-Null

    $uid = $body.uid
    $encPass = [uri]::EscapeDataString($GrafanaPassword)
    $dashUrl = "http://admin:${encPass}@127.0.0.1:${LocalPort}/d/${uid}"

    $playwright = Get-Command npx -ErrorAction SilentlyContinue
    if ($playwright) {
        $shotScript = Join-Path $env:TEMP "grafana-shot.mjs"
        @"
import { chromium } from 'playwright';
const url = process.env.GRAFANA_URL;
const out = process.env.GRAFANA_OUT;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
"@ | Set-Content -Path $shotScript -Encoding UTF8
        $env:GRAFANA_URL = $dashUrl
        $env:GRAFANA_OUT = $OutFile
        Push-Location $RepoRoot
        try {
            npx --yes playwright install chromium 2>$null | Out-Null
            node $shotScript
        } finally {
            Pop-Location
            Remove-Item $shotScript -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Saved screenshot: $OutFile"
        return
    }

    Write-Warning @"
Playwright not available. Open Grafana manually and save a screenshot:
  $dashUrl
  (user admin, password from GRAFANA_ADMIN_PASSWORD)
Save as: $OutFile
"@
} finally {
    Stop-Job $pf -ErrorAction SilentlyContinue
    Remove-Job $pf -Force -ErrorAction SilentlyContinue
}
