variable "project_name" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "secrets_prefix" {
  type    = string
  default = "mini-ecommerce-devops"
}

variable "tags" {
  type    = map(string)
  default = {}
}
