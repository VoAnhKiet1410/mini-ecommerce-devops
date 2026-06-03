$ErrorActionPreference = "Stop"
$org = "VoAnhKiet1410"
$appRepo = "$org/mini-ecommerce-devops"
$gitopsRepo = "$org/mini-ecommerce-gitops"

Remove-Item Env:GITHUB_TOKEN, Env:GH_TOKEN -ErrorAction SilentlyContinue
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

$status = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in. Run: gh auth login -h github.com -p https -w -s repo"
  Write-Host $status
  exit 1
}

gh auth setup-git | Out-Null

function Push-Repo {
  param([string]$Path, [string]$Name)
  Push-Location $Path
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $remotes = @(git remote 2>$null)
    if ($remotes -contains "origin") {
      git remote remove origin 2>$null | Out-Null
    }
    git remote add origin "https://github.com/${Name}.git"
    git branch -M main 2>$null | Out-Null
    git push -u origin main 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
      throw "git push failed for $Name"
    }
    Write-Host "Pushed $Name"
  } finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

Push-Repo -Path (Resolve-Path (Join-Path $PSScriptRoot "..")) -Name $appRepo
$gitopsPath = "d:\mini-ecommerce-gitops"
if (Test-Path $gitopsPath) {
  Push-Repo -Path $gitopsPath -Name $gitopsRepo
} else {
  Write-Warning "GitOps repo not found at $gitopsPath"
}
