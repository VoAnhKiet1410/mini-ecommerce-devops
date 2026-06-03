#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$port = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { '8080' }
$response = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 30
if ($response.StatusCode -ne 200) {
    Write-Error "FAIL: expected HTTP 200, got $($response.StatusCode)"
    exit 1
}
Write-Host 'PASS: frontend HTTP 200'
