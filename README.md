# Mini E-commerce DevOps Platform

**Agent skills (DevOps/AWS):** first-time setup: `.\scripts\setup-agent-skills.ps1` (Windows) or `./scripts/setup-agent-skills.sh`. See [AGENTS.md](AGENTS.md) and [docs/agent-skills.md](docs/agent-skills.md).

Portfolio DevOps project based on [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (happy-path services only).

## Quick start (local)

```bash
cp .env.example .env
docker compose up --build -d
./scripts/verify-platform-db.sh
./scripts/smoke-local.sh
```

**Windows (PowerShell):** after `docker compose up --build -d`, run `.\scripts\verify-platform-db.ps1` and `.\scripts\smoke-local.ps1`.

Open http://localhost:8080

## Architecture

See [docs/architecture.md](docs/architecture.md).

## AWS (ephemeral)

See [docs/runbooks/aws-up.md](docs/runbooks/aws-up.md). **Run `terraform destroy` when finished.**

## CI/CD (Phase 2)

GitHub Actions build happy-path images, scan with Trivy (SARIF for CRITICAL/HIGH; warn-only on `main`), and push to ECR via OIDC. See [docs/runbooks/github-actions-setup.md](docs/runbooks/github-actions-setup.md).

## Observability (Phase 4)

CloudWatch RDS alarms (Terraform) and Prometheus/Grafana on EKS (`kube-prometheus-stack`). See [docs/runbooks/observability.md](docs/runbooks/observability.md).

After install, run `.\scripts\verify-phase4.ps1`, port-forward Grafana, and import `observability/aws/dashboards/cluster-overview.json`. Re-run `terraform apply` after Phase 3 ingress so ALB alarms are created. Add a dashboard screenshot here for portfolio demos when ready.

## Platform database disclosure

RDS/Compose PostgreSQL is provisioned as a **platform database**. Happy-path services use upstream storage (Redis, in-memory catalog) in Phase 1.
