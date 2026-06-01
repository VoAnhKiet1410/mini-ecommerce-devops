terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = var.tags
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_ecr_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_ecr" {
  name               = "${var.project_name}-github-actions-ecr"
  assume_role_policy = data.aws_iam_policy_document.github_ecr_trust.json
  tags               = var.tags
}

data "aws_iam_policy_document" "github_ecr_push" {
  statement {
    sid    = "ECRAuth"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }
  statement {
    sid    = "ECRPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [
      "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/mini-ecommerce/*",
    ]
  }
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  name   = "ecr-push"
  role   = aws_iam_role.github_actions_ecr.id
  policy = data.aws_iam_policy_document.github_ecr_push.json
}

data "aws_iam_policy_document" "github_terraform_plan_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_terraform_plan" {
  name               = "${var.project_name}-github-actions-terraform-plan"
  assume_role_policy = data.aws_iam_policy_document.github_terraform_plan_trust.json
  tags               = var.tags
}

data "aws_iam_policy_document" "github_terraform_plan" {
  statement {
    sid    = "TerraformPlanDescribe"
    effect = "Allow"
    actions = [
      "autoscaling:Describe*",
      "dynamodb:Describe*",
      "dynamodb:List*",
      "ec2:Describe*",
      "ecr:Describe*",
      "ecr:List*",
      "eks:Describe*",
      "eks:List*",
      "elasticloadbalancing:Describe*",
      "iam:Get*",
      "iam:List*",
      "kms:Describe*",
      "kms:List*",
      "logs:Describe*",
      "logs:List*",
      "rds:Describe*",
      "rds:List*",
      "s3:GetBucket*",
      "s3:GetObject",
      "s3:ListBucket",
      "secretsmanager:Describe*",
      "secretsmanager:List*",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_actions_terraform_plan" {
  name   = "terraform-plan-read"
  role   = aws_iam_role.github_actions_terraform_plan.id
  policy = data.aws_iam_policy_document.github_terraform_plan.json
}
