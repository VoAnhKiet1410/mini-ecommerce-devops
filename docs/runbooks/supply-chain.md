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

## Future hardening (not implemented)

- Kyverno `verifyImages` admission policy on EKS: reject unsigned images in the `boutique` namespace.
- SLSA provenance attestation (`slsa-github-generator`).
