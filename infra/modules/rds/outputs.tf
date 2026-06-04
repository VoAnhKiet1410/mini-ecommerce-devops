output "endpoint" {
  value = aws_db_instance.this.endpoint
}

output "address" {
  value = aws_db_instance.this.address
}

output "master_username" {
  value = aws_db_instance.this.username
}

output "master_password" {
  value     = random_password.master.result
  sensitive = true
}

output "database_name" {
  value = aws_db_instance.this.db_name
}

output "db_instance_identifier" {
  value = aws_db_instance.this.identifier
}
