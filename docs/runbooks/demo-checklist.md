# Recruiter demo checklist

## Before the demo

- [ ] `terraform.tfvars` / `backend.hcl` configured (org, repo, state bucket, AWS profile)
- [ ] `terraform apply` completed; `kubectl get nodes` shows Ready
- [ ] AWS Load Balancer Controller pods Running (`.\scripts\verify-aws-lbc.ps1`)
- [ ] EKS workers `m7i-flex.large` (or run `terraform apply` after changing `eks_instance_types`)
- [ ] Phase 3: `.\scripts\install-eso.ps1` → `.\scripts\install-argocd.ps1` → `.\scripts\verify-phase3.ps1` PASS
- [ ] ALB URL bookmarked

## Demo script (~10 min)

1. **Local** (optional): `docker compose up -d` → http://localhost:8080 — browse products, add to cart.
2. **IaC**: Show `infra/modules/` and `terraform output` (EKS, ECR, RDS endpoint).
3. **CI** (Phase 2): Show GitHub Actions build + Trivy scan + ECR push via OIDC.
4. **GitOps**: Argo CD UI → synced `online-boutique` application.
5. **AWS URL**: Open ALB hostname; same happy-path UI.
6. **Observability** (Phase 4): Grafana dashboard or `kubectl top pods`.
7. **Teardown story**: Explain `terraform destroy` and ephemeral cost model.

## Talking points

- Platform PostgreSQL vs app storage (Redis, in-memory catalog) — honest scope.
- No secrets in git; Secrets Manager + External Secrets Operator.
- `terraform plan` on PR; apply manual only.

## After demo

```bash
cd infra/environments/aws && terraform destroy
```
