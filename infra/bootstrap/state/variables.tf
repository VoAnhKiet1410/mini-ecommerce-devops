variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "state_bucket_name" {
  type = string
}

variable "lock_table_name" {
  type    = string
  default = "mini-ecommerce-devops-tflock"
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "mini-ecommerce-devops"
    Environment = "shared"
    ManagedBy   = "terraform"
  }
}
