# Portfolio assets

| File | Source |
|------|--------|
| `aws-platform-architecture.png` | Rendered from `docs/draw_architecture.py`, matching `aws-platform-architecture.drawio` |
| `aws-platform-architecture.svg` | SVG render of the README architecture diagram |
| `aws-platform-architecture.drawio` | Editable draw.io source for the README architecture diagram |
| `aws-architecture-diagram.html` | Editable diagram source (open in browser or re-render to PNG) |
| `aws-icons/*.svg` | Cached [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (via weibeld/aws-icons-svg mirror) |
| `grafana-cluster-overview.png` | `scripts/capture-grafana-screenshot.ps1` after Phase 4 monitoring install |

**Regenerate AWS diagram:** `python docs/draw_architecture.py`, then copy `docs/architecture-diagram.png` and `.svg` to `docs/assets/aws-platform-architecture.*`.

**Blog (tiếng Việt):** [Kiến trúc hệ thống](../blog/kien-truc-mini-ecommerce-devops.md) · [Facebook + DOCX](../blog/facebook-kien-truc-mini-ecommerce-devops.docx)

If the Grafana PNG is missing, run capture script or follow [observability runbook](../runbooks/observability.md).
