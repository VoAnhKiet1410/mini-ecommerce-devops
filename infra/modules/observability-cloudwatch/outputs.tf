output "rds_cpu_alarm_name" {
  value = aws_cloudwatch_metric_alarm.rds_cpu.alarm_name
}

output "rds_free_storage_alarm_name" {
  value = aws_cloudwatch_metric_alarm.rds_free_storage.alarm_name
}

output "alb_target_5xx_alarm_names" {
  description = "Empty until an LBC-managed ALB exists; re-apply after Phase 3 ingress"
  value       = [for a in aws_cloudwatch_metric_alarm.alb_target_5xx : a.alarm_name]
}
