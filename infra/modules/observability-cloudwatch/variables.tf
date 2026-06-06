variable "name" {
  type        = string
  description = "Prefix for CloudWatch alarm names"
}

variable "db_instance_id" {
  type        = string
  description = "RDS DBInstanceIdentifier dimension value"
}

variable "rds_cpu_threshold_percent" {
  type        = number
  default     = 80
  description = "Alarm when average CPUUtilization exceeds this percent"
}

variable "rds_free_storage_threshold_gib" {
  type        = number
  default     = 2
  description = "Alarm when FreeStorageSpace falls below this many gibibytes"
}

variable "eks_cluster_name" {
  type        = string
  description = "EKS cluster name — used to discover LBC-tagged ALBs for optional ALB alarms"
}

variable "alb_target_5xx_threshold" {
  type        = number
  default     = 10
  description = "Alarm when sum of HTTPCode_Target_5XX_Count exceeds this count per 5-minute period"
}

variable "alarm_actions" {
  type        = list(string)
  default     = []
  description = "SNS topic ARNs to notify when an alarm transitions to ALARM state (optional)"
}

variable "tags" {
  type    = map(string)
  default = {}
}
