# Push app repo after creating empty public repos on GitHub:
#   https://github.com/VoAnhKiet1410/mini-ecommerce-devops
#   https://github.com/VoAnhKiet1410/mini-ecommerce-gitops
#
# Requires GITHUB_TOKEN (or gh auth login) with repo push scope.

$ErrorActionPreference = "Stop"
$org = "VoAnhKiet1410"
$appRepo = "$org/mini-ecommerce-devops"
$gitopsRepo = "$org/mini-ecommerce-gitops"

$token = $env:GITHUB_TOKEN
if (-not $token) {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
  $token = gh auth token 2>$null
}
if (-not $token) {
  Write-Error "Set GITHUB_TOKEN or run: gh auth login"
}

function Push-Repo {
  param([string]$Path, [string]$Name)
  Push-Location $Path
  try {
    $url = "https://x-access-token:${token}@github.com/${Name}.git"
    git remote remove origin 2>$null
    git remote add origin $url
    git branch -M main 2>$null
    git push -u origin main
    Write-Host "Pushed $Name"
  } finally {
    Pop-Location
  }
}

Push-Repo -Path (Resolve-Path (Join-Path $PSScriptRoot "..")) -Name $appRepo
$gitopsPath = Resolve-Path (Join-Path $PSScriptRoot "..\..\mini-ecommerce-gitops") -ErrorAction SilentlyContinue
if (-not $gitopsPath) {
  $gitopsPath = "d:\mini-ecommerce-gitops"
}
if (Test-Path $gitopsPath) {
  Push-Repo -Path $gitopsPath -Name $gitopsRepo
} else {
  Write-Warning "GitOps repo not found at $gitopsPath — clone or create $gitopsRepo manually."
}
