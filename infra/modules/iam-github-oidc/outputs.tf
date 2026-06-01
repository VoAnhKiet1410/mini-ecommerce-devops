output "github_actions_ecr_role_arn" {
  value = aws_iam_role.github_actions_ecr.arn
}

output "github_actions_terraform_plan_role_arn" {
  value = aws_iam_role.github_actions_terraform_plan.arn
}

output "github_oidc_provider_arn" {
  value = local.github_oidc_provider_arn
}
