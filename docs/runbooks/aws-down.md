# AWS teardown runbook

Destroy the ephemeral stack to avoid ongoing AWS charges.

## Before destroy

1. Optional: remove Argo CD applications and workloads in `boutique` namespace.
2. Confirm `rds_skip_final_snapshot = true` in `infra/environments/aws/terraform.tfvars` (default in example).

## Destroy infrastructure

```bash
cd infra/environments/aws
terraform destroy
```

Review the plan carefully. Type `yes` when prompted.

## After destroy

- EKS cluster, RDS, ALB, and NAT gateway are removed.
- ECR images may remain until lifecycle policies or manual deletion.
- S3 state bucket and DynamoDB lock table from **bootstrap** are retained unless you destroy bootstrap separately.

## Bootstrap cleanup (optional)

Only if retiring the project entirely:

```bash
cd infra/bootstrap/state
# Empty the state bucket first, then:
terraform destroy
```
