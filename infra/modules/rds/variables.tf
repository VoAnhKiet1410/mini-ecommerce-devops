variable "name" {
  type        = string
  description = "Name prefix for RDS resources (identifier, subnet group, security group)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the RDS instance will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for the RDS subnet group (multi-AZ recommended)"
}

variable "database_name" {
  type        = string
  default     = "platform"
  description = "Name of the initial database to create"
}

variable "master_username" {
  type        = string
  default     = "platform"
  description = "Master username for the RDS instance"
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "Security group IDs allowed to connect to the RDS instance on port 5432"
}

variable "engine_version" {
  type        = string
  default     = "16"
  description = "PostgreSQL engine version"
}

variable "instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "RDS instance type"
}

variable "backup_retention_period" {
  type        = number
  default     = 1
  description = "Days to retain automated backups (0 disables backups; production should use 7+)"
}

variable "skip_final_snapshot" {
  type        = bool
  default     = true
  description = "Skip final DB snapshot on destroy (true for ephemeral/demo environments)"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to all RDS resources"
}
