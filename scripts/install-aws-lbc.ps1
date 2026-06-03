# Task 1.10 — Install AWS Load Balancer Controller on EKS
# Prereqs: terraform apply done, kubectl configured, helm installed

$ErrorActionPreference = "Stop"
$Region = "ap-southeast-1"
$ClusterName = "mini-ecommerce-devops"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$AwsEnv = Join-Path $RepoRoot "infra\environments\aws"

Push-Location $AwsEnv
try {
    $RoleArn = terraform output -raw alb_controller_role_arn 2>$null
    if (-not $RoleArn) {
        Write-Error "Run terraform apply in infra/environments/aws first."
    }
} finally {
    Pop-Location
}

Write-Host "Cluster: $ClusterName | IRSA role: $RoleArn"
aws eks update-kubeconfig --region $Region --name $ClusterName

helm repo add eks https://aws.github.io/eks-charts 2>$null
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller `
  -n kube-system `
  --set clusterName=$ClusterName `
  --set serviceAccount.create=true `
  --set serviceAccount.name=aws-load-balancer-controller `
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=$RoleArn"

Write-Host "`nWaiting for controller pods..."
kubectl wait --for=condition=ready pod `
  -l app.kubernetes.io/name=aws-load-balancer-controller `
  -n kube-system --timeout=300s

kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
Write-Host "`nPASS: AWS Load Balancer Controller is Running"
