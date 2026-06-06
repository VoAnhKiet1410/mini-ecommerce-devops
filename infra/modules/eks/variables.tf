variable "cluster_name" {
  type        = string
  default     = "mini-ecommerce-devops"
  description = "EKS cluster name"
}

variable "cluster_version" {
  type        = string
  default     = "1.30"
  description = "Kubernetes version for the EKS cluster"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the EKS cluster will be created"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for EKS node group (private subnets recommended)"
}

variable "instance_types" {
  type        = list(string)
  default     = ["m7i-flex.large"]
  description = "EC2 instance types for the managed node group"
}

variable "node_min_size" {
  type        = number
  default     = 1
  description = "Minimum number of nodes in the managed node group"
}

variable "node_max_size" {
  type        = number
  default     = 1
  description = "Maximum number of nodes in the managed node group"
}

variable "node_desired_size" {
  type        = number
  default     = 1
  description = "Desired number of nodes in the managed node group"
}

variable "cluster_endpoint_public_access_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0"]
  description = "CIDRs allowed to reach the public EKS API endpoint (demo: restrict to your IP when possible)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags to apply to all EKS resources"
}
