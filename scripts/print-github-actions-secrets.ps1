# Print GitHub Actions secret values for manual setup (Settings → Secrets → Actions).
# Requires: terraform apply completed; AWS CLI optional.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envDir = Join-Path $root "infra\environments\aws"
$bootstrapDir = Join-Path $root "infra\bootstrap\state"

Push-Location $envDir
try {
    $ecrArn = terraform output -raw github_actions_ecr_role_arn
    $planArn = terraform output -raw github_actions_terraform_plan_role_arn
} finally {
    Pop-Location
}

Push-Location $bootstrapDir
try {
    $bucket = terraform output -raw bucket
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Add these repository secrets (VoAnhKiet1410/mini-ecommerce-devops):" -ForegroundColor Cyan
Write-Host "  AWS_ECR_ROLE_ARN              = $ecrArn"
Write-Host "  AWS_TERRAFORM_PLAN_ROLE_ARN   = $planArn"
Write-Host "  AWS_TF_STATE_BUCKET           = $bucket"
Write-Host ""
Write-Host "After secrets exist, open a PR touching infra/ to verify Terraform Plan + Security Scan." -ForegroundColor Yellow
