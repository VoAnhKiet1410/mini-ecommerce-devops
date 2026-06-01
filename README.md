# Mini E-commerce DevOps Platform

Portfolio DevOps project based on [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (happy-path services only).

## Quick start (local)

```bash
cp .env.example .env
docker compose up --build -d
./scripts/smoke-local.sh
```

Open http://localhost:8080

## Architecture

See [docs/architecture.md](docs/architecture.md).

## AWS (ephemeral)

See [docs/runbooks/aws-up.md](docs/runbooks/aws-up.md). **Run `terraform destroy` when finished.**

## Platform database disclosure

RDS/Compose PostgreSQL is provisioned as a **platform database**. Happy-path services use upstream storage (Redis, in-memory catalog) in Phase 1.
