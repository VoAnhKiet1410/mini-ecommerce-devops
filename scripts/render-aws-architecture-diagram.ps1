# Download official AWS architecture SVGs and render docs/assets/aws-platform-architecture.png
param(
    [string]$OutFile = $(Join-Path (Split-Path $PSScriptRoot -Parent) "docs\assets\aws-platform-architecture.png")
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$HtmlFile = Join-Path $RepoRoot "docs\assets\aws-architecture-diagram.html"
$IconDir = Join-Path $RepoRoot "docs\assets\aws-icons"
$IconBase = "https://raw.githubusercontent.com/weibeld/aws-icons-svg/main/q1-2022/Architecture-Service-Icons_01312022"

$icons = @{
    "elastic-kubernetes-service.svg" = "Arch_Containers/64/Arch_Amazon-Elastic-Kubernetes-Service_64.svg"
    "elastic-container-registry.svg" = "Arch_Containers/64/Arch_Amazon-Elastic-Container-Registry_64.svg"
    "rds.svg"                          = "Arch_Database/64/Arch_Amazon-RDS_64.svg"
    "elastic-load-balancing.svg"       = "Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.svg"
    "vpc.svg"                          = "Arch_Networking-Content-Delivery/64/Arch_Amazon-Virtual-Private-Cloud_64.svg"
    "secrets-manager.svg"              = "Arch_Security-Identity-Compliance/64/Arch_AWS-Secrets-Manager_64.svg"
    "iam.svg"                          = "Arch_Security-Identity-Compliance/64/Arch_AWS-Identity-and-Access-Management_64.svg"
    "cloudwatch.svg"                   = "Arch_Management-Governance/64/Arch_Amazon-CloudWatch_64.svg"
}

# Minimal Argo CD mark (CNCF; not AWS)
$argocdSvg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ef7b4d"/><path fill="#fff" d="M20 38 L32 18 L44 38 Z"/><circle cx="32" cy="40" r="6" fill="#fff"/></svg>
'@

New-Item -ItemType Directory -Force -Path (Split-Path $OutFile -Parent), $IconDir | Out-Null

foreach ($entry in $icons.GetEnumerator()) {
    $dest = Join-Path $IconDir $entry.Key
    $url = "$IconBase/$($entry.Value)"
    Write-Host "Downloading $($entry.Key) ..."
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

Set-Content -Path (Join-Path $IconDir "argocd.svg") -Value $argocdSvg -Encoding UTF8

if (-not (Test-Path $HtmlFile)) {
    Write-Error "Missing HTML template: $HtmlFile"
}

$htmlUri = [Uri]::new($HtmlFile).AbsoluteUri
Write-Host "Rendering $htmlUri -> $OutFile"

Push-Location $RepoRoot
try {
    # Chromium must exist locally (run once: npx playwright install chromium)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    npx --yes playwright screenshot `
        --browser chromium `
        --viewport-size "2100,900" `
        --full-page `
        --wait-for-timeout 1500 `
        $htmlUri `
        $OutFile 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "playwright screenshot failed (exit $LASTEXITCODE). Install browser: npx playwright install chromium"
    }
    $ErrorActionPreference = $prevEap
}
finally {
    Pop-Location
}

if (-not (Test-Path $OutFile)) {
    Write-Error "PNG was not created: $OutFile"
}

Write-Host "Done: $OutFile"
