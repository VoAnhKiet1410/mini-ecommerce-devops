output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "rds_master_secret_arn" {
  value = module.secrets.rds_master_secret_arn
}

output "github_actions_ecr_role_arn" {
  value = module.iam_github_oidc.github_actions_ecr_role_arn
}

output "github_actions_terraform_plan_role_arn" {
  value = module.iam_github_oidc.github_actions_terraform_plan_role_arn
}

output "alb_controller_role_arn" {
  value = module.iam_irsa.alb_controller_role_arn
}

output "external_secrets_role_arn" {
  value = module.iam_irsa.external_secrets_role_arn
}

output "cloudwatch_rds_alarm_names" {
  description = "RDS CloudWatch alarms (Phase 4)"
  value = [
    module.observability_cloudwatch.rds_cpu_alarm_name,
    module.observability_cloudwatch.rds_free_storage_alarm_name,
  ]
}

output "cloudwatch_alb_alarm_names" {
  description = "ALB target 5xx alarms (Phase 4); populated after LBC ingress + re-apply"
  value       = module.observability_cloudwatch.alb_target_5xx_alarm_names
}
