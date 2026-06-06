# Mini E-commerce DevOps trên AWS — Kiến trúc trong 3 bước

**Portfolio DevOps** tôi vừa hoàn thiện: microservices Online Boutique (Google demo) chạy trên **Amazon EKS**, không phải “chỉ deploy app” — mà cả câu chuyện **CI/CD · GitOps · bảo mật · monitoring**.

![Sơ đồ kiến trúc AWS](../assets/aws-platform-architecture.png)

---

## Điểm nổi bật trên sơ đồ kiến trúc

**1. GitHub → AWS không cần access key cố định**  
Push code → GitHub Actions → **OIDC** assume role → push image lên **ECR**. An toàn, đúng chuẩn pipeline hiện đại.

**2. Deploy bằng GitOps, không kubectl tay**  
Repo GitOps (Kustomize) → **Argo CD** sync → pods trên EKS. Rollback và audit qua Git.

**3. Traffic rõ một đường**  
Users → **ALB** → Load Balancer Controller → **frontend** → catalog → cart → checkout (+ **Redis** giỏ hàng).

**4. Platform tách khỏi app**  
**RDS PostgreSQL**, **Secrets Manager**, **CloudWatch**, **Terraform + S3 state** — lớp nền cho DevOps, không trộn lẫn logic microservices Phase 1.

**5. Quan sát hệ thống**  
**Prometheus + Grafana** trong cluster, alarm RDS qua CloudWatch (Terraform).

**6. IaC có kỷ luật**  
`terraform plan` trên PR — **không apply trong CI**; apply thủ công sau khi review. Stack **ephemeral**: demo xong thì destroy tiết kiệm chi phí.

---

## Ba luồng trên hình (đọc từ trái sang phải)

| Bước | Ý nghĩa |
|------|---------|
| **① Source → CI** | App repo + GitHub Actions, OIDC vào AWS |
| **② Build & Deploy** | ECR + Argo CD → EKS (happy-path services) |
| **③ Platform** | Secrets, RDS, monitoring, Terraform state |

---

## Tech stack (tóm tắt)

AWS **ap-southeast-1** · **EKS** · **ECR** · **ALB** · **RDS** · **Argo CD** · **GitHub Actions** · **Terraform** · **Prometheus/Grafana**

---

## Happy-path Phase 1

Chỉ deploy đủ demo: **frontend · productcatalog · cartservice · checkoutservice · Redis** — gọn, rẻ, dễ giải thích trong phỏng vấn / portfolio.

---

*Sơ đồ chi tiết: `docs/assets/aws-platform-architecture.png` · Repo: Mini E-commerce DevOps Platform*
