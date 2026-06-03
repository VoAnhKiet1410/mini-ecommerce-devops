param(
    [Parameter(Mandatory = $true)]
    [string]$AlbHostname
)

$uri = "http://$AlbHostname/"
try {
    $response = Invoke-WebRequest -Uri $uri -Method Head -UseBasicParsing -TimeoutSec 30
    $code = [int]$response.StatusCode
} catch {
    if ($_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode.value__
    } else {
        Write-Error "FAIL: request failed: $_"
        exit 1
    }
}

if ($code -eq 200) {
    Write-Host "PASS: frontend HTTP 200"
} else {
    Write-Error "FAIL: expected HTTP 200, got $code"
    exit 1
}
