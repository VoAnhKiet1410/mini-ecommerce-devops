# Import cluster-overview dashboard via Grafana API and save a PNG for README (requires port-forward).
param(
    [string]$GrafanaPassword = $(if ($env:GRAFANA_ADMIN_PASSWORD) { $env:GRAFANA_ADMIN_PASSWORD } else { "admin" }),
    [int]$LocalPort = 3000,
    [int]$WaitSeconds = 120
)

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

    # Build import payload without going through ConvertFrom-Json/ConvertTo-Json to
    # avoid numeric type coercion that Grafana 10+ rejects as "bad request data".
    $rawDash = Get-Content $DashboardJson -Raw -Encoding UTF8
    $importJson = "{`"dashboard`":$rawDash,`"overwrite`":true,`"folderUid`":`"`"}"
    $tmpImport = Join-Path $env:TEMP "grafana-import-$([System.Guid]::NewGuid().ToString('N')).json"
    [System.IO.File]::WriteAllText($tmpImport, $importJson, [System.Text.UTF8Encoding]::new($false))
    try {
        $encAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:${GrafanaPassword}"))
        $resp = curl.exe -sf -X POST "$base/api/dashboards/db" `
            -H "Authorization: Basic $encAuth" `
            -H "Content-Type: application/json" `
            --data-binary "@$tmpImport" 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Error "Dashboard import failed: $resp" }
    } finally {
        Remove-Item $tmpImport -Force -ErrorAction SilentlyContinue
    }

    $dashRaw = Get-Content $DashboardJson -Raw | ConvertFrom-Json
    $uid = $dashRaw.uid
    $encPass = [uri]::EscapeDataString($GrafanaPassword)
    $dashUrl = "http://admin:${encPass}@127.0.0.1:${LocalPort}/d/${uid}"

    # Create a short-lived service account token (Grafana 10+ compatible).
    # /api/login cookie approach was removed; service account tokens work reliably.
    $saResp = curl.exe -sf -u "admin:${GrafanaPassword}" -X POST "$base/api/serviceaccounts" `
        -H "Content-Type: application/json" `
        -d '{"name":"screenshot-bot-tmp","role":"Viewer"}' 2>&1
    $saId = if ($saResp -match '"id":(\d+)') { $matches[1] } else { "" }
    $grafanaToken = ""
    if ($saId) {
        $tokResp = curl.exe -sf -u "admin:${GrafanaPassword}" -X POST "$base/api/serviceaccounts/${saId}/tokens" `
            -H "Content-Type: application/json" `
            -d '{"name":"shot-token"}' 2>&1
        if ($tokResp -match '"key":"([^"]+)"') { $grafanaToken = $matches[1] }
    }
    if (-not $grafanaToken) { Write-Warning "Could not create service account token; screenshot may be blank" }

    if (Get-Command npx -ErrorAction SilentlyContinue) {
        # Install playwright in an isolated temp dir so the project root stays clean.
        $pwDir = Join-Path $env:TEMP "pw-grafana-shot"
        New-Item -ItemType Directory -Force -Path $pwDir | Out-Null
        $shotScript = Join-Path $pwDir "shot.mjs"
        @"
import { chromium } from 'playwright';
const base  = process.env.GRAFANA_BASE;
const token = process.env.GRAFANA_TOKEN;
const uid   = process.env.GRAFANA_UID;
const out   = process.env.GRAFANA_OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
// auth_token in URL causes Grafana to set a session cookie, enabling SPA AJAX calls.
// kiosk=tv hides nav/toolbar for a clean dashboard screenshot.
const dashUrl = base + '/d/' + uid + '?auth_token=' + token + '&from=now-1h&to=now&kiosk=tv';
await page.goto(dashUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(10000);
const title = await page.title();
console.error('page title:', title, 'url:', page.url());
const hidden = await page.evaluate(() => {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  dialogs.forEach(el => { el.style.display = 'none'; });
  return dialogs.length;
});
console.error('dialogs hidden:', hidden);
await page.waitForTimeout(2000);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
"@ | Set-Content -Path $shotScript -Encoding UTF8
        Push-Location $pwDir
        try {
            if (-not (Test-Path (Join-Path $pwDir "node_modules\playwright"))) {
                Write-Host "Installing playwright in temp dir..."
                npm install playwright --save 2>&1 | Out-Null
                npx playwright install chromium 2>&1 | Out-Null
            }
            $env:GRAFANA_BASE  = "http://127.0.0.1:${LocalPort}"
            $env:GRAFANA_TOKEN = $grafanaToken
            $env:GRAFANA_UID   = $uid
            $env:GRAFANA_OUT   = $OutFile
            node $shotScript
        } finally {
            Pop-Location
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
