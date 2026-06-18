# Recruiter demo checklist

CV-ready walkthrough for the Mini E-commerce DevOps Platform. Environment is **ephemeral** — run `terraform destroy` when finished.

## Before the demo

- [ ] `terraform.tfvars` / `backend.hcl` configured (org, repo, state bucket, AWS profile)
- [ ] `terraform apply` completed; `kubectl get nodes` shows Ready
- [ ] AWS Load Balancer Controller pods Running (`.\scripts\verify-aws-lbc.ps1`)
- [ ] EKS workers `m7i-flex.large` (or run `terraform apply` after changing `eks_instance_types`)
- [ ] Phase 3: `.\scripts\install-eso.ps1` → `.\scripts\install-argocd.ps1` → `.\scripts\verify-phase3.ps1` PASS
- [ ] Phase 4: `terraform apply` again after ingress (ALB alarms) → `.\scripts\install-monitoring.ps1` → `.\scripts\verify-phase4.ps1` PASS → Grafana import `observability/aws/dashboards/cluster-overview.json`
- [ ] GitHub Actions secrets configured (`AWS_ECR_ROLE_ARN`, …) — see [github-actions-setup.md](github-actions-setup.md)
- [ ] ALB URL bookmarked

## Demo script (~10 min)

Follow this order (matches portfolio success criteria):

1. **Local:** `docker compose up -d` → http://localhost:8080 — browse products, add to cart.
2. **IaC:** `terraform apply` → EKS; show `infra/modules/` and `terraform output` (EKS, ECR, RDS endpoint).
3. **GitOps:** Argo CD UI → **Synced / Healthy** for `online-boutique`.
4. **AWS URL:** Open ALB hostname; same happy-path UI as local.
5. **Observability:** Grafana `cluster-overview` dashboard (or `.\scripts\capture-grafana-screenshot.ps1`); optional CloudWatch RDS alarms.
6. **CI (Phase 2 / 5):** GitHub Actions — ECR push via OIDC; Trivy **CRITICAL** gate on `main`; Checkov on infra PRs.
7. **Teardown story:** Explain `terraform destroy` and ephemeral cost model.

## Talking points

- Platform PostgreSQL vs app storage (Redis, in-memory catalog) — honest scope.
- No secrets in git; Secrets Manager + External Secrets Operator.
- `terraform plan` on PR; apply manual only.
- Trivy fails on **CRITICAL**; **HIGH** reported in SARIF artifacts.

## Known limitations (be ready to explain)

| Topic | Reality | What to say |
|-------|---------|-------------|
| **Checkout on EKS** | Only 4 services on cluster (`frontend`, `productcatalog`, `cartservice`, `checkoutservice` + Redis). `currencyservice`, `shippingservice`, `paymentservice`, `emailservice` are Compose-only. | "Browse + add to cart works on EKS. Full checkout (place order) works locally in Compose where all dependencies are present. EKS scope is deliberately narrow to focus on the DevOps platform." |
| **RDS not used by the app** | RDS is provisioned as a platform DB. Pods still use Redis/in-memory per upstream semantics (Approach A). | "RDS is provisioned, encrypted, credentials synced via ESO — I demonstrated the full secret pipeline. Migrating catalog to Postgres is the next optional phase." |
| **No HTTPS** | ALB serves HTTP. Route 53 + ACM was deferred. | "Ephemeral stack — buying a domain just for a demo isn't justified. ACM + Ingress annotation would be a one-afternoon addition if needed." |
| **cosign sign, not yet enforce** | Images are signed by CI; the cluster does **not** yet reject unsigned images (Kyverno `verifyImages` available but optional). | "Supply chain: sign in CI, verify locally. Cluster-side enforcement with Kyverno is set up in `infra/kyverno/`; apply when the policy is approved." |
| **Tier 1 CI (Infracost, GitOps auto-PR)** | Code committed but E2E verify pending (needs live AWS + GitHub secrets push). | "Features are code-complete and skip gracefully when secrets are absent — green CI is maintained even without them." |

## After demo — full teardown test

Verify destroy completes without orphan cleanup (except remote state bucket):

```bash
cd infra/environments/aws
terraform destroy
```

Confirm in AWS console: no EKS cluster, RDS, ALB, or NAT left running (S3 state bucket may remain by design).
