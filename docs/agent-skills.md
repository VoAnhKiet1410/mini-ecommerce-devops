# Agent skills (DevOps / AWS)

Skills cài vào [`.agents/skills/`](../.agents/skills/) bằng [Skills CLI](https://skills.sh/). Cursor đọc tự động; rule luôn bật: [`.cursor/rules/mini-ecommerce-devops.mdc`](../.cursor/rules/mini-ecommerce-devops.mdc).

## Cài đặt chuẩn (lần đầu hoặc máy mới)

**Yêu cầu:** Node.js (cho `npx`), git clone repo.

```powershell
# Windows — từ thư mục gốc repo
.\scripts\setup-agent-skills.ps1
```

```bash
# Linux / macOS / Git Bash
chmod +x scripts/setup-agent-skills.sh
./scripts/setup-agent-skills.sh
```

Script sẽ:

1. Cài 8 skill từ registry (Terraform, DevOps, AWS toolkit, GitHub Actions, …)
2. Chạy `npx skills update`
3. Kiểm tra skill **mini-ecommerce-devops** (có sẵn trong git)

Sau đó mở Cursor tại workspace này — không cần cấu hình thêm.

## Danh sách skill

| Skill | Package | Mô tả |
|-------|---------|--------|
| **mini-ecommerce-devops** | (git) | Ngữ cảnh dự án, runbooks, quy ước |
| **terraform-engineer** | `jeffallan/claude-skills@terraform-engineer` | Terraform `infra/` |
| **devops-engineer** | `jeffallan/claude-skills@devops-engineer` | DevOps / K8s / Docker |
| **aws-iam** | `aws/agent-toolkit-for-aws@aws-iam` | IAM, OIDC, IRSA |
| **aws-observability** | `aws/agent-toolkit-for-aws@aws-observability` | CloudWatch, observability |
| **aws-billing-and-cost-management** | `aws/agent-toolkit-for-aws@aws-billing-and-cost-management` | Chi phí EKS/RDS demo |
| **github-actions-docs** | `xixu-me/skills@github-actions-docs` | GitHub Actions |
| **devops-cicd** | `miles990/claude-software-skills@devops-cicd` | Pipeline CI/CD |
| **docker-kubernetes** | `absolutelyskilled/absolutelyskilled@docker-kubernetes` | Docker + EKS |

Khóa phiên bản: [`skills-lock.json`](../skills-lock.json).

## Dùng trong Cursor

1. Mở Agent chat trong workspace.
2. Gắn skill: `/terraform-engineer`, `/aws-iam`, … hoặc mô tả task — rule `mini-ecommerce-devops` luôn nhắc agent đọc [AGENTS.md](../AGENTS.md).
3. Đọc [AGENTS.md](../AGENTS.md) trước khi sửa `infra/` hoặc `.github/workflows/`.

## Cập nhật

```bash
npx skills check
npx skills update
```

Thêm skill mới:

```bash
npx skills add aws/agent-toolkit-for-aws@aws-observability -y
```

Cập nhật cả `scripts/setup-agent-skills.ps1` và `scripts/setup-agent-skills.sh`, rồi bảng trong file này.

## Bảo mật

- Skill chạy với quyền agent — chỉ dùng nguồn tin cậy (skills.sh).
- `docker-kubernetes`: Snyk **Critical Risk** — xem lại trước khi chạy script từ skill.
- Không commit secret; skill không thay review Terraform/IAM.

## Tùy chọn

| Skill | Lệnh cài |
|-------|----------|
| AWS CLI | `npx skills add spillwavesolutions/mastering-aws-cli@mastering-aws-cli -y` |

Tạo skill team: `npx skills init my-skill` → `.agents/skills/<tên>/SKILL.md`.
