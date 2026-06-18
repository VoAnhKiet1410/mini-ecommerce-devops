# Supply-chain security (image signing + SBOM)

Every happy-path image pushed to ECR by `ci-build-push.yml` goes through:

```
docker build/push (tag: <git-sha> + latest)
→ Trivy gate (fail on CRITICAL)
→ cosign sign (keyless, GitHub OIDC)
→ syft SBOM (SPDX JSON, uploaded as workflow artifact)
→ cosign attest (SBOM attached to the image as an attestation)
```

Only images that cleared the Trivy CRITICAL gate get signed — a valid signature therefore also proves the image passed the scan gate at build time.

## How signing works (keyless)

- CI requests a short-lived OIDC token from GitHub (`id-token: write`).
- cosign exchanges it for an ephemeral certificate from the Sigstore CA (Fulcio); the signature is logged in the public transparency log (Rekor).
- The certificate identity is the workflow URL — `https://github.com/VoAnhKiet1410/mini-ecommerce-devops/...` — so verification proves the image was built **by this repo's CI**, not by a laptop.
- No private keys are stored anywhere; signatures and attestations live in ECR as OCI artifacts next to the image.

## Verify locally

Prerequisites: AWS CLI authenticated, [cosign](https://docs.sigstore.dev/cosign/system_config/installation/) installed (`winget install sigstore.cosign` / `brew install cosign`).

```powershell
# Windows
.\scripts\verify-image-signature.ps1                       # frontend:latest
.\scripts\verify-image-signature.ps1 -Service cartservice -Tag <git-sha>
```

```bash
# Linux/Mac
./scripts/verify-image-signature.sh                        # frontend:latest
./scripts/verify-image-signature.sh cartservice <git-sha>
```

The script resolves the image digest from ECR, then runs `cosign verify` and `cosign verify-attestation --type spdxjson` pinned to:

- `--certificate-identity-regexp "^https://github.com/VoAnhKiet1410/mini-ecommerce-devops/"`
- `--certificate-oidc-issuer https://token.actions.githubusercontent.com`

`PASS` means: signed by this repo's GitHub Actions, with a verified SBOM attestation.

## Inspect the SBOM

- **Workflow artifact:** download `sbom-<service>.spdx.json` from the CI run.
- **From the attestation:**

```bash
cosign verify-attestation "$IMAGE" --type spdxjson \
  --certificate-identity-regexp "^https://github.com/VoAnhKiet1410/mini-ecommerce-devops/" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  | jq -r '.payload' | base64 -d | jq '.predicate'
```

## Cluster-side enforcement (Kyverno)

The `infra/kyverno/boutique-verify-images.yaml` `ClusterPolicy` rejects any Pod in the
`boutique` namespace whose image was **not** signed by this repo's CI pipeline.

Install after Argo CD is healthy:

```powershell
# Windows — enforce mode (blocks unsigned Pods)
.\scripts\install-kyverno.ps1

# Audit mode first (logs violations, does not block)
.\scripts\install-kyverno.ps1 -AuditOnly
```

```bash
./scripts/install-kyverno.sh
./scripts/install-kyverno.sh --audit-only
```

**How it works:**
1. Kyverno intercepts every `Pod` admission in the `boutique` namespace.
2. For images matching `<account>.dkr.ecr.ap-southeast-1.amazonaws.com/mini-ecommerce/*`, it calls Rekor to verify the cosign signature.
3. The signature must have been issued by `https://token.actions.githubusercontent.com` for the exact `ci-build-push.yml@refs/heads/main` subject.
4. No signature → admission denied.

**ECR auth note:** Kyverno needs to pull OCI artifacts (signatures) from ECR. The install script creates a Kubernetes `docker-registry` secret (`ecr-pull-secret`) using `aws ecr get-login-password`. ECR tokens expire after 12 hours — re-run the install script before a demo or add an automated refresh CronJob. A more robust alternative is IRSA for the Kyverno service account.

## Future hardening

- SLSA provenance attestation (`slsa-github-generator`).
- IRSA for Kyverno admissionController (eliminates the 12 h ECR token refresh).
- Extend the policy to verify SBOM attestations (`cosign verify-attestation --type spdxjson`).
