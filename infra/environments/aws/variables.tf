variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project_name" {
  type    = string
  default = "mini-ecommerce-devops"
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type    = string
  default = "mini-ecommerce-devops"
}

variable "rds_skip_final_snapshot" {
  type    = bool
  default = true
}

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if GitHub OIDC provider already exists in this AWS account"
}
