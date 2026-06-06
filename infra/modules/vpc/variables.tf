variable "name" {
  type        = string
  description = "Name prefix for VPC and subnet resources"
}

variable "cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "azs" {
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
  description = "Availability zones to use for subnets"
}

variable "private_subnets" {
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
  description = "CIDR blocks for private subnets (one per AZ)"
}

variable "public_subnets" {
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
  description = "CIDR blocks for public subnets (one per AZ)"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to all VPC resources"
}
