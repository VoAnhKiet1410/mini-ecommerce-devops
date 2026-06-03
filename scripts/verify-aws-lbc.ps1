# Task 1.10 verification - kubectl only (no Helm required)
$ErrorActionPreference = "Stop"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$ClusterName = if ($env:EKS_CLUSTER_NAME) { $env:EKS_CLUSTER_NAME } else { "mini-ecommerce-devops" }
$Label = "app.kubernetes.io/name=aws-load-balancer-controller"

aws eks update-kubeconfig --region $Region --name $ClusterName | Out-Null
kubectl get pods -n kube-system -l $Label

$json = kubectl get pods -n kube-system -l $Label -o json
$pods = ($json | ConvertFrom-Json).items
if (-not $pods -or $pods.Count -eq 0) {
    Write-Error "FAIL: no AWS Load Balancer Controller pods found"
}
foreach ($pod in $pods) {
    $ready = $false
    foreach ($cond in $pod.status.conditions) {
        if ($cond.type -eq "Ready" -and $cond.status -eq "True") { $ready = $true }
    }
    if (-not $ready) {
        Write-Error "FAIL: pod $($pod.metadata.name) is not Ready"
    }
}
Write-Host ('PASS: Task 1.10 - AWS Load Balancer Controller pods Ready ({0} pods)' -f $pods.Count)
