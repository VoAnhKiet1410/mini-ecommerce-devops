terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_secretsmanager_secret" "rds_master" {
  name = "${var.prefix}/rds/master"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds_master" {
  secret_id = aws_secretsmanager_secret.rds_master.id
  secret_string = jsonencode({
    username = var.username
    password = var.password
    host     = var.host
    port     = 5432
    dbname   = var.dbname
  })
}
