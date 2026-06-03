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
  default = "1.30"
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if GitHub OIDC provider already exists in this AWS account"
}

variable "terraform_state_lock_table_name" {
  type        = string
  default     = "mini-ecommerce-devops-tflock"
  description = "Must match infra/bootstrap/state lock_table_name and backend.hcl dynamodb_table."
}

variable "cluster_endpoint_public_access_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0"]
  description = "Restrict EKS public API to your IP(s), e.g. [\"203.0.113.10/32\"], for safer demos."
}

variable "eks_instance_types" {
  type        = list(string)
  default     = ["m7i-flex.large"]
  description = "EKS managed node group instance types (ap-southeast-1)."
}
