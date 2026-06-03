# Install / refresh project agent skills (Skills CLI).
# Run from repo root: .\scripts\setup-agent-skills.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$packages = @(
    "jeffallan/claude-skills@terraform-engineer",
    "jeffallan/claude-skills@devops-engineer",
    "aws/agent-toolkit-for-aws@aws-iam",
    "aws/agent-toolkit-for-aws@aws-observability",
    "aws/agent-toolkit-for-aws@aws-billing-and-cost-management",
    "xixu-me/skills@github-actions-docs",
    "miles990/claude-software-skills@devops-cicd",
    "absolutelyskilled/absolutelyskilled@docker-kubernetes"
)

Write-Host "Installing agent skills into .agents/skills/ ..."
foreach ($pkg in $packages) {
    Write-Host "  -> $pkg"
    npx --yes skills add $pkg -y
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Updating skills ..."
npx --yes skills update

$projectSkill = Join-Path $Root ".agents\skills\mini-ecommerce-devops\SKILL.md"
if (-not (Test-Path $projectSkill)) {
    Write-Error "Missing project skill: $projectSkill (commit .agents/skills/mini-ecommerce-devops from git)"
    exit 1
}

Write-Host ""
Write-Host "Done. Skills:"
Get-ChildItem (Join-Path $Root ".agents\skills") -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""
Write-Host "See AGENTS.md and docs/agent-skills.md"
