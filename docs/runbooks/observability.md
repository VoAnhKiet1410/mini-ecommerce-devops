# Observability runbook (Phase 4)

Prometheus + Grafana on EKS and CloudWatch alarms for the platform RDS instance.

## Prerequisites

- Phase 3 complete: app synced, ALB smoke OK
- `terraform apply` in `infra/environments/aws` (includes CloudWatch RDS alarms)
- `helm` and `kubectl` configured for `mini-ecommerce-devops`

## 1. CloudWatch — RDS alarms (Terraform)

Alarms are created by module `infra/modules/observability-cloudwatch`:

| Alarm | Metric | Threshold |
|-------|--------|-----------|
| `{project}-rds-cpu-high` | `CPUUtilization` | > 80% (2×5 min) |
| `{project}-rds-free-storage-low` | `FreeStorageSpace` | < 2 GiB |
| `{project}-alb-target-5xx-*` | `HTTPCode_Target_5XX_Count` | > 10 / 5 min (per LBC ALB) |

RDS alarms exist on the first `terraform apply`. **ALB alarms** are created only when an LBC-tagged ALB exists (after Phase 3 ingress). If the first apply ran before ingress, re-apply:

```bash
cd infra/environments/aws
terraform plan -out=tfplan
terraform apply tfplan
terraform output cloudwatch_rds_alarm_names
terraform output cloudwatch_alb_alarm_names
```

Verify alarms and monitoring (after `install-monitoring`):

```powershell
.\scripts\verify-phase4.ps1
# CloudWatch only (before Helm):
.\scripts\verify-phase4.ps1 -SkipMonitoring
```

```bash
chmod +x scripts/verify-phase4.sh
./scripts/verify-phase4.sh
```

## 2. Prometheus + Grafana (Helm)

Resource limits are tuned for a single **`m7i-flex.large`** node — see `observability/aws/helm-values/kube-prometheus-stack.yaml`.

**Do not commit a real Grafana admin password.** Set at install time:

```powershell
$env:GRAFANA_ADMIN_PASSWORD = "your-lab-password"
.\scripts\install-monitoring.ps1
```

```bash
export GRAFANA_ADMIN_PASSWORD='your-lab-password'
chmod +x scripts/install-monitoring.sh
./scripts/install-monitoring.sh
```

**Manual Helm:**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n observability --create-namespace \
  -f observability/aws/helm-values/kube-prometheus-stack.yaml \
  --set grafana.adminPassword="$GRAFANA_ADMIN_PASSWORD"
```

Wait until pods in `observability` are `Running`:

```bash
kubectl get pods -n observability
```

## 3. Grafana dashboard

```bash
kubectl port-forward svc/monitoring-grafana -n observability 3000:80
```

Open http://localhost:3000 (user `admin`, password from install).

Import **Dashboards → Import → Upload JSON**:

`observability/aws/dashboards/cluster-overview.json`

If panels show *No data*, map the dashboard datasource to your Prometheus instance (UID may differ from `prometheus` in the JSON).

**README screenshot (automated):**

```powershell
.\scripts\capture-grafana-screenshot.ps1
# writes docs/assets/grafana-cluster-overview.png (requires Playwright via npx, or save manually)
```

**Full Phase 4 E2E** (cluster already up, or `-ApplyInfra` to bootstrap + apply):

```powershell
.\scripts\run-phase4-e2e.ps1
.\scripts\run-phase4-e2e.ps1 -ApplyInfra   # after terraform destroy / no EKS
```

Optional: export an updated JSON after edits and commit the PNG for portfolio demos.

## 4. Quick checks without Grafana

```bash
kubectl top nodes
kubectl top pods -n boutique
```

## 5. Teardown

Helm release is destroyed with the cluster. CloudWatch alarms are removed on `terraform destroy` in `infra/environments/aws`.
