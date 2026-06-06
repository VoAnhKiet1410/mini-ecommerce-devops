terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.name}-rds-cpu-high"
  alarm_description   = "RDS CPU utilization above ${var.rds_cpu_threshold_percent}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_cpu_threshold_percent
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "${var.name}-rds-free-storage-low"
  alarm_description   = "RDS free storage below ${var.rds_free_storage_threshold_gib} GiB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_free_storage_threshold_gib * 1024 * 1024 * 1024
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }

  tags = var.tags
}

# ALBs are created by the AWS Load Balancer Controller after Phase 3 ingress.
# On first apply there may be none; re-run apply after boutique ingress is healthy.
data "aws_lbs" "k8s_ingress" {
  tags = {
    "elbv2.k8s.aws/cluster" = var.eks_cluster_name
  }
}

locals {
  alb_load_balancer_dimensions = {
    for arn in data.aws_lbs.k8s_ingress.arns :
    arn => regex("loadbalancer/(.+)$", arn)[0]
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx" {
  for_each = local.alb_load_balancer_dimensions

  alarm_name          = "${var.name}-alb-target-5xx-${substr(sha256(each.value), 0, 8)}"
  alarm_description   = "ALB target HTTP 5xx count above ${var.alb_target_5xx_threshold} (${each.value})"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.alb_target_5xx_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions

  dimensions = {
    LoadBalancer = each.value
  }

  tags = var.tags
}
