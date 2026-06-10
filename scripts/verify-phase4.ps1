# Phase 4 verification: CloudWatch RDS/ALB alarms + kube-prometheus-stack (Grafana)
param(
    [switch]$SkipMonitoring
)

$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$RepoRoot = Split-Path $PSScriptRoot -Parent
$TfDir = Join-Path $RepoRoot "infra\environments\aws"
$ReleaseName = "monitoring"
$Namespace = "observability"

function Get-TerraformOutputJson {
    param([string]$Name)
    Push-Location $TfDir
    try {
        $raw = terraform output -json $Name 2>$null
        if (-not $raw) { return @() }
        return ($raw | ConvertFrom-Json)
    } finally {
        Pop-Location
    }
}

function Test-CloudWatchAlarmExists {
    param([string]$AlarmName)
    $state = aws cloudwatch describe-alarms `
        --region $Region `
        --alarm-names $AlarmName `
        --query "MetricAlarms[0].StateValue" `
        --output text 2>$null
    if (-not $state -or $state -eq "None") {
        Write-Error "CloudWatch alarm not found: $AlarmName"
    }
    Write-Host "  alarm $AlarmName : $state"
}

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null

Write-Host "=== CloudWatch - RDS alarms ==="
$rdsAlarms = @(Get-TerraformOutputJson "cloudwatch_rds_alarm_names")
if ($rdsAlarms.Count -lt 2) {
    Write-Error "Expected 2 RDS alarm names from terraform output cloudwatch_rds_alarm_names"
}
foreach ($name in $rdsAlarms) {
    Test-CloudWatchAlarmExists -AlarmName $name
}

Write-Host "`n=== CloudWatch - ALB alarms ==="
$albAlarms = @(Get-TerraformOutputJson "cloudwatch_alb_alarm_names")
$ingressHost = kubectl get ingress frontend-ingress -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null

if ($albAlarms.Count -eq 0) {
    if ($ingressHost) {
        Write-Warning @"
No ALB CloudWatch alarms in Terraform state, but boutique ingress has ALB: $ingressHost
Re-run from infra/environments/aws after Phase 3 ingress is healthy:
  terraform plan -out=tfplan
  terraform apply tfplan
"@
    } else {
        Write-Host "  (no ALB ingress yet - skip ALB alarm check)"
    }
} else {
    foreach ($name in $albAlarms) {
        Test-CloudWatchAlarmExists -AlarmName $name
    }
}

if ($SkipMonitoring) {
    Write-Host "`nPASS: Phase 4 CloudWatch verification complete (monitoring skipped)"
    exit 0
}

Write-Host "`n=== Prometheus / Grafana ==="
kubectl get namespace $Namespace 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Namespace '$Namespace' missing. Run: .\scripts\install-monitoring.ps1"
}

kubectl get pods -n $Namespace
kubectl wait --for=condition=available "deployment/${ReleaseName}-grafana" -n $Namespace --timeout=300s

$grafanaPod = kubectl get pods -n $Namespace -l "app.kubernetes.io/name=grafana" -o jsonpath='{.items[0].status.phase}' 2>$null
if ($grafanaPod -ne "Running") {
    Write-Error "Grafana pod not Running (phase=$grafanaPod)"
}

Write-Host "`nGrafana UI: kubectl port-forward svc/${ReleaseName}-grafana -n $Namespace 3000:80"
Write-Host "Import dashboard: observability/aws/dashboards/cluster-overview.json"
Write-Host "`nPASS: Phase 4 verification complete"
