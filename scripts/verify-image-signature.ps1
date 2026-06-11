# Verify cosign keyless signature + SBOM attestation of an ECR image.
# Requires: aws CLI (authenticated), cosign (winget install sigstore.cosign).
param(
    [string]$Service = "frontend",
    [string]$Tag = "latest",
    [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }),
    [string]$GithubOrg = "VoAnhKiet1410",
    [string]$GithubRepo = "mini-ecommerce-devops"
)
$ErrorActionPreference = "Stop"

$_c1 = Get-Command cosign -ErrorAction SilentlyContinue
$_c2 = Get-Command cosign-windows-amd64 -ErrorAction SilentlyContinue
$cosignCmd = if ($_c1) { $_c1.Source } elseif ($_c2) { $_c2.Source } else { $null }
if (-not $cosignCmd) {
    Write-Error "cosign not found. Install: winget install sigstore.cosign"
}
Set-Alias -Name cosign -Value $cosignCmd -Scope Script

$AccountId = aws sts get-caller-identity --query Account --output text
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$RepoName = "mini-ecommerce/$Service"

Write-Host "Resolving digest for ${RepoName}:${Tag}..."
$Digest = aws ecr describe-images --region $Region --repository-name $RepoName `
    --image-ids imageTag=$Tag --query "imageDetails[0].imageDigest" --output text
if (-not $Digest -or $Digest -eq "None") {
    Write-Error "FAIL: image ${RepoName}:${Tag} not found in ECR"
}
$Image = "$Registry/${RepoName}@$Digest"
Write-Host "Image: $Image`n"

# Docker Desktop uses a credential store that cosign cannot access directly.
# Build a temp Docker config with the ECR token inline so cosign can authenticate.
$EcrToken = aws ecr get-login-password --region $Region
$AuthB64  = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("AWS:$EcrToken"))
$TempDir  = Join-Path $env:TEMP "cosign-verify-$(Get-Random)"
New-Item -ItemType Directory -Path $TempDir | Out-Null
[System.IO.File]::WriteAllText(
    "$TempDir\config.json",
    '{"auths":{"' + $Registry + '":{"auth":"' + $AuthB64 + '"}}}'
)
$SavedDockerConfig = $env:DOCKER_CONFIG
$env:DOCKER_CONFIG = $TempDir

$IdentityRegexp = "^https://github.com/$GithubOrg/$GithubRepo/"
$Issuer = "https://token.actions.githubusercontent.com"

try {
    # PS 5.1 treats any native-command stderr as a terminating error under
    # ErrorActionPreference=Stop. Temporarily relax to Continue for cosign calls
    # and rely on $LASTEXITCODE for pass/fail.
    $eap = $ErrorActionPreference; $ErrorActionPreference = "Continue"

    Write-Host "=== cosign verify (signature) ==="
    & $cosignCmd verify $Image `
        --certificate-identity-regexp $IdentityRegexp `
        --certificate-oidc-issuer $Issuer
    $verifyExit = $LASTEXITCODE

    Write-Host "`n=== cosign verify-attestation (SBOM, SPDX JSON) ==="
    & $cosignCmd verify-attestation $Image --type spdxjson `
        --certificate-identity-regexp $IdentityRegexp `
        --certificate-oidc-issuer $Issuer | Out-Null
    $attestExit = $LASTEXITCODE

    $ErrorActionPreference = $eap

    if ($verifyExit  -ne 0) { throw "FAIL: signature verification failed" }
    if ($attestExit  -ne 0) { throw "FAIL: SBOM attestation verification failed" }
} finally {
    $env:DOCKER_CONFIG = $SavedDockerConfig
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
}

Write-Host "`nPASS: ${RepoName}:${Tag} is signed by GitHub Actions ($GithubOrg/$GithubRepo) and has a verified SBOM attestation"
