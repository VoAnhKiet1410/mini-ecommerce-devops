variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "database_name" {
  type    = string
  default = "platform"
}

variable "master_username" {
  type    = string
  default = "platform"
}

variable "allowed_security_group_ids" {
  type = list(string)
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
