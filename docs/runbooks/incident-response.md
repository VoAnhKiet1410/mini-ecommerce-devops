# Incident response playbook

Quick diagnostic steps for the three most common failure modes in this stack.
Each section follows: **Detect → Diagnose → Fix → Verify**.

---

## IR-1: ALB returning 5xx / frontend unreachable

### Detect

```bash
# CloudWatch alarm should have fired (ALBHighHTTP5xxRate)
aws cloudwatch describe-alarm-history \
  --alarm-name "mini-ecommerce-alb-5xx" \
  --region ap-southeast-1

# Or: direct HTTP check
ALB=$(kubectl get ingress frontend-ingress -n boutique -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl -o /dev/null -sw "%{http_code}\n" "http://${ALB}/"
```

### Diagnose

```bash
# 1. Are frontend pods Running?
kubectl get pods -n boutique -l app=frontend

# 2. Pod logs — look for panic / gRPC dial errors
kubectl logs -n boutique -l app=frontend --tail=50

# 3. Are all required backend pods healthy?
kubectl get pods -n boutique

# 4. Check ALB target group health in AWS console:
#    EC2 → Load Balancers → find ALB → Target Groups → check health
#    Or via CLI:
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --query "TargetGroups[?contains(TargetGroupName,'boutique')].TargetGroupArn" \
    --output text)

# 5. Check AWS LBC is managing the ingress
kubectl describe ingress frontend-ingress -n boutique
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --tail=30
```

### Common causes and fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Frontend pod `CrashLoopBackOff` | gRPC `mustConnGRPC` panic — missing backend addr | Check env vars: `kubectl describe pod <pod> -n boutique`; verify all 4 service pods are Running |
| ALB returns 502 | Target pod not ready; readiness probe failing | `kubectl describe pod <pod> -n boutique`; check `READY` column; force restart: `kubectl rollout restart deployment/frontend -n boutique` |
| 503 Service Unavailable | No healthy targets | Check LBC logs; check security group allows port 8080 from ALB to node |
| Ingress has no ALB hostname | LBC not running or IRSA role not attached | `kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`; re-run `.\scripts\install-aws-lbc.ps1` |

### Verify

```bash
curl -o /dev/null -sw "%{http_code}\n" "http://${ALB}/"
# Expected: 200
```

---

## IR-2: Pod stuck in CrashLoopBackOff or Pending

### Detect

```bash
kubectl get pods -n boutique
# Look for STATUS: CrashLoopBackOff | ImagePullBackOff | Pending | OOMKilled
```

### Diagnose

```bash
POD=<pod-name>

# 1. Events — most informative for Pending / scheduling failures
kubectl describe pod "$POD" -n boutique | tail -30

# 2. Previous container logs (if CrashLoop)
kubectl logs "$POD" -n boutique --previous --tail=50

# 3. Resource pressure on node
kubectl top nodes
kubectl describe node $(kubectl get pod "$POD" -n boutique -o jsonpath='{.spec.nodeName}')

# 4. ImagePullBackOff — check ECR image exists and pull secret
kubectl describe pod "$POD" -n boutique | grep -A5 "Events"
kubectl get secret ecr-pull-secret -n boutique 2>/dev/null || echo "no pull secret in boutique ns"
```

### Common causes and fixes

| STATUS | Cause | Fix |
|--------|-------|-----|
| `ImagePullBackOff` | ECR image not pushed yet or IAM pull permission missing | Trigger CI (`workflow_dispatch` or push to `src/**`); verify IRSA node role has `ecr:GetAuthorizationToken` |
| `Pending` (Unschedulable) | Insufficient CPU/memory on node | `kubectl describe node` → check Allocatable vs Requests; scale node group or reduce resource requests |
| `CrashLoopBackOff` (gRPC panic) | `mustConnGRPC` panic — service addr env var wrong or backend not up | Fix env var in Kustomize overlay; rebuild Argo CD sync |
| `OOMKilled` | Container exceeds memory limit | Increase `resources.limits.memory` in manifest; redeploy via gitops PR |
| `CrashLoopBackOff` (Redis) | cartservice can't reach Redis | `kubectl get svc redis -n boutique`; `kubectl exec -it <redis-pod> -n boutique -- redis-cli ping` |

### Fix: force pod restart after manifest fix

```bash
# After merging a fix in the gitops repo, Argo CD resyncs automatically.
# To force-sync immediately:
argocd app sync online-boutique --force

# Or restart the specific deployment:
kubectl rollout restart deployment/<deployment-name> -n boutique
kubectl rollout status deployment/<deployment-name> -n boutique
```

### Verify

```bash
kubectl get pods -n boutique
# All pods: STATUS=Running, READY=1/1 (or 2/2 for sidecars)
```

---

## IR-3: Argo CD application OutOfSync or Degraded

### Detect

```bash
kubectl get application online-boutique -n argocd
# Check SYNC STATUS and HEALTH STATUS columns
argocd app get online-boutique   # requires argocd CLI logged in
```

### Diagnose

```bash
# 1. Describe the Application for sync errors
kubectl describe application online-boutique -n argocd

# 2. Check Argo CD server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=50

# 3. List resources out of sync
argocd app diff online-boutique

# 4. ExternalSecret / ESO errors (RDS credentials not syncing)
kubectl get externalsecret -n boutique
kubectl describe externalsecret rds-credentials -n boutique  # or your ExternalSecret name

# 5. Is Argo CD reachable to the gitops repo?
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=30
```

### Common causes and fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `OutOfSync` | New image tag bumped in gitops repo PR was merged; Argo CD detected drift | `argocd app sync online-boutique` (or click Sync in UI) |
| `Degraded` after sync | One or more pods not becoming Healthy | Check `kubectl get pods -n boutique`; see IR-2 |
| `ComparisonError: Unable to resolve` | Kustomize can't resolve image tag (ECR image not yet pushed) | Push images via CI first; then re-sync |
| `ExternalSecret` `SecretSyncedError` | Secrets Manager secret missing or ESO role wrong | Check `aws secretsmanager get-secret-value --secret-id mini-ecommerce-devops/rds/master --region ap-southeast-1`; verify IRSA role for ESO |
| `repo-server` can't clone gitops repo | GitHub repo became private or deploy key expired | Check repo visibility on GitHub; verify Argo CD `repo` secret |

### Fix: manual sync with Argo CD CLI

```bash
# Port-forward Argo CD (if not using ingress)
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login (password is base64 admin secret)
PASS=$(kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d)
argocd login localhost:8080 --username admin --password "$PASS" --insecure

# Sync
argocd app sync online-boutique

# Hard refresh (bypass cache)
argocd app get online-boutique --hard-refresh
```

### Fix: re-apply Argo CD Application manifest

```bash
# If Application CR was accidentally deleted:
kubectl apply -f path/to/mini-ecommerce-gitops/clusters/aws/online-boutique-app.yaml
```

### Verify

```bash
kubectl get application online-boutique -n argocd
# SYNC STATUS: Synced   HEALTH STATUS: Healthy
kubectl get pods -n boutique
# All Running
```

---

## Useful one-liners

```bash
# Stream live events across all namespaces
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20

# Check resource usage
kubectl top pods -n boutique
kubectl top nodes

# Restart all deployments in boutique (last resort)
kubectl rollout restart deployments -n boutique

# Describe all non-Running pods
kubectl get pods -n boutique --field-selector=status.phase!=Running \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | \
  xargs -I{} kubectl describe pod {} -n boutique

# Tail CloudWatch logs for ALB access
aws logs tail /aws/eks/mini-ecommerce-devops/application --follow --region ap-southeast-1
```
