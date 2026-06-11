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

if (-not (Get-Command cosign -ErrorAction SilentlyContinue)) {
    Write-Error "cosign not found. Install: winget install sigstore.cosign"
}

$AccountId = aws sts get-caller-identity --query Account --output text
$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$RepoName = "mini-ecommerce/$Service"

Write-Host "Logging cosign into $Registry..."
aws ecr get-login-password --region $Region | cosign login --username AWS --password-stdin $Registry

Write-Host "Resolving digest for ${RepoName}:${Tag}..."
$Digest = aws ecr describe-images --region $Region --repository-name $RepoName `
    --image-ids imageTag=$Tag --query "imageDetails[0].imageDigest" --output text
if (-not $Digest -or $Digest -eq "None") {
    Write-Error "FAIL: image ${RepoName}:${Tag} not found in ECR"
}
$Image = "$Registry/${RepoName}@$Digest"
Write-Host "Image: $Image`n"

$IdentityRegexp = "^https://github.com/$GithubOrg/$GithubRepo/"
$Issuer = "https://token.actions.githubusercontent.com"

Write-Host "=== cosign verify (signature) ==="
cosign verify $Image `
    --certificate-identity-regexp $IdentityRegexp `
    --certificate-oidc-issuer $Issuer
if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: signature verification failed" }

Write-Host "`n=== cosign verify-attestation (SBOM, SPDX JSON) ==="
cosign verify-attestation $Image --type spdxjson `
    --certificate-identity-regexp $IdentityRegexp `
    --certificate-oidc-issuer $Issuer | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: SBOM attestation verification failed" }

Write-Host "`nPASS: ${RepoName}:${Tag} is signed by GitHub Actions ($GithubOrg/$GithubRepo) and has a verified SBOM attestation"
