variable "prefix" {
  type = string
}

variable "username" {
  type = string
}

variable "password" {
  type      = string
  sensitive = true
}

variable "host" {
  type = string
}

variable "dbname" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
