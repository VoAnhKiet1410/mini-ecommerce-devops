output "alb_controller_role_arn" {
  value = module.alb_controller.iam_role_arn
}

output "external_secrets_role_arn" {
  value = module.external_secrets.iam_role_arn
}
