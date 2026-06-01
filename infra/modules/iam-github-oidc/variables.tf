variable "project_name" {
  type = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
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
