# Portfolio assets

| File | Source |
|------|--------|
| `aws-platform-architecture.png` | `scripts/render-aws-architecture-diagram.ps1` (AWS official SVG icons + Playwright) |
| `aws-architecture-diagram.html` | Editable diagram source (open in browser or re-render to PNG) |
| `aws-icons/*.svg` | Cached [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (via weibeld/aws-icons-svg mirror) |
| `grafana-cluster-overview.png` | `scripts/capture-grafana-screenshot.ps1` after Phase 4 monitoring install |

**Regenerate AWS diagram:** `.\scripts\render-aws-architecture-diagram.ps1` (requires `npx playwright install chromium` once).

**Blog (tiếng Việt):** [Kiến trúc hệ thống](../blog/kien-truc-mini-ecommerce-devops.md) · [Facebook + DOCX](../blog/facebook-kien-truc-mini-ecommerce-devops.docx)

If the Grafana PNG is missing, run capture script or follow [observability runbook](../runbooks/observability.md).
