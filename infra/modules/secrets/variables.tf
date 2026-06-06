variable "prefix" {
  type        = string
  description = "Path prefix for the Secrets Manager secret (e.g. 'mini-ecommerce/prod')"
}

variable "username" {
  type        = string
  description = "Database master username to store in the secret"
}

variable "password" {
  type        = string
  sensitive   = true
  description = "Database master password to store in the secret"
}

variable "host" {
  type        = string
  description = "Database hostname or endpoint to store in the secret"
}

variable "dbname" {
  type        = string
  description = "Database name to store in the secret"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to the Secrets Manager secret"
}
