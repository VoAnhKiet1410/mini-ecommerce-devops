output "rds_master_secret_arn" {
  value = aws_secretsmanager_secret.rds_master.arn
}

output "rds_master_secret_name" {
  value = aws_secretsmanager_secret.rds_master.name
}
