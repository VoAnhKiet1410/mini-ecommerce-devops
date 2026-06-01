# Architecture

> Skeleton — expand in Phase 0 Task 0.4 with Mermaid diagrams and design decisions.

## Overview

Mini E-commerce DevOps Platform wraps Google microservices-demo (happy-path services) with Docker Compose locally and ephemeral AWS (EKS, ECR, RDS, ALB) via Terraform.

## Platform database

RDS and Compose PostgreSQL are **platform databases**. Application services use upstream storage (Redis, in-memory catalog) in Phase 1.

## Repositories

- **App repo** (`mini-ecommerce-devops`): source, `infra/`, Compose, CI
- **GitOps repo** (`mini-ecommerce-gitops`): Kustomize manifests, Argo CD apps

## Ephemeral AWS

Provision for demos only; run `terraform destroy` when idle. See [runbooks/aws-down.md](runbooks/aws-down.md).
