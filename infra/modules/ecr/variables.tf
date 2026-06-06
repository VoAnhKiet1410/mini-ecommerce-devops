variable "repository_names" {
  type = list(string)
  default = [
    "frontend",
    "productcatalogservice",
    "cartservice",
    "checkoutservice",
  ]
  description = "List of ECR repository names (path suffix after the prefix)"
}

variable "repository_path_prefix" {
  type        = string
  default     = "mini-ecommerce"
  description = "ECR repository path prefix (e.g. 'mini-ecommerce' creates 'mini-ecommerce/<name>')"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to all ECR resources"
}
