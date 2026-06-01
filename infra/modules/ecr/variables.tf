variable "repository_names" {
  type = list(string)
  default = [
    "frontend",
    "productcatalogservice",
    "cartservice",
    "checkoutservice",
  ]
}

variable "tags" {
  type    = map(string)
  default = {}
}
