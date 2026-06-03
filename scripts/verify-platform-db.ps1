#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path .env) { Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim() } } }

$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'platform' }
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'platform' }

docker compose exec -T postgres psql -U $user -d $db -c 'SELECT 1 AS platform_db_ok;'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Platform PostgreSQL connectivity OK'
