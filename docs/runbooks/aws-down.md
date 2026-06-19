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

## Clear GitHub Secrets (important)

The OIDC provider and IAM roles are destroyed with the stack, so any remaining GitHub Secrets will cause `ci-build-push.yml` to run `build-push` and fail with "No OpenIDConnect provider found" instead of skipping cleanly.

Clear the three AWS secrets after every `terraform destroy`:

```bash
gh secret delete AWS_ECR_ROLE_ARN
gh secret delete AWS_TERRAFORM_PLAN_ROLE_ARN
gh secret delete AWS_TF_STATE_BUCKET
```

When bringing the stack back up, restore them from `terraform output`:

```bash
gh secret set AWS_ECR_ROLE_ARN        --body "$(terraform output -raw github_actions_ecr_role_arn)"
gh secret set AWS_TERRAFORM_PLAN_ROLE_ARN --body "$(terraform output -raw github_actions_terraform_plan_role_arn)"
gh secret set AWS_TF_STATE_BUCKET     --body "voanhkiet1410-mini-ecommerce-tfstate-962765735385"
```

## Bootstrap cleanup (optional)

Only if retiring the project entirely:

```bash
cd infra/bootstrap/state
# Empty the state bucket first, then:
terraform destroy
```
