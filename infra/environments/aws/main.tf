locals {
  tags = {
    Project     = var.project_name
    Environment = "aws"
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source = "../../modules/vpc"
  name   = "${var.project_name}-vpc"
  tags   = local.tags
}

module "eks" {
  source                               = "../../modules/eks"
  cluster_name                         = var.project_name
  cluster_version                      = var.cluster_version
  vpc_id                               = module.vpc.vpc_id
  subnet_ids                           = module.vpc.private_subnets
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs
  tags                                 = local.tags
}

module "ecr" {
  source = "../../modules/ecr"
  tags   = local.tags
}

module "rds" {
  source = "../../modules/rds"

  name       = "${var.project_name}-platform"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  allowed_security_group_ids = [
    module.eks.node_security_group_id,
    module.eks.cluster_security_group_id,
  ]
  skip_final_snapshot = var.rds_skip_final_snapshot
  tags                = local.tags
}

module "iam_github_oidc" {
  source                          = "../../modules/iam-github-oidc"
  project_name                    = var.project_name
  github_org                      = var.github_org
  github_repo                     = var.github_repo
  aws_region                      = var.aws_region
  terraform_state_lock_table_name = var.terraform_state_lock_table_name
  create_github_oidc_provider     = var.create_github_oidc_provider
  tags                            = local.tags
}

module "iam_irsa" {
  source            = "../../modules/iam-irsa"
  project_name      = var.project_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  aws_region        = var.aws_region
  secrets_prefix    = var.project_name
  tags              = local.tags
}

module "secrets" {
  source   = "../../modules/secrets"
  prefix   = var.project_name
  username = module.rds.master_username
  password = module.rds.master_password
  host     = module.rds.address
  dbname   = module.rds.database_name
  tags     = local.tags
}
