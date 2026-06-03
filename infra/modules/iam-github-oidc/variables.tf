variable "project_name" {
  type = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "github_ecr_branch" {
  type        = string
  default     = "main"
  description = "Only this branch may assume the ECR push role (GitHub OIDC sub)."
}

variable "terraform_state_lock_table_name" {
  type        = string
  default     = "mini-ecommerce-devops-tflock"
  description = "DynamoDB table from infra/bootstrap/state (must match backend.hcl dynamodb_table)."
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if token.actions.githubusercontent.com OIDC provider already exists in this account"
}

variable "tags" {
  type    = map(string)
  default = {}
}
