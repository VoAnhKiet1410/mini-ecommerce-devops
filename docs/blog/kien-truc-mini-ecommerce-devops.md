# Kiến trúc Mini E-commerce DevOps Platform: từ GitHub đến EKS trên AWS

*Mini E-commerce DevOps Platform* là dự án portfolio DevOps xây quanh [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (Online Boutique). Thay vì triển khai toàn bộ demo gốc, tôi thu hẹp phạm vi runtime xuống **happy-path** — đủ để người dùng duyệt sản phẩm, giỏ hàng và checkout — và dồn phần lớn công sức vào **nền tảng**: Terraform, CI/CD, GitOps, bảo mật OIDC/IRSA và quan sát hệ thống.

Bài viết này mô tả **bối cảnh tổng thể** của hệ thống: ai nói chuyện với ai, theo thứ tự nào, và vì sao kiến trúc được chia thành ba luồng chính.

---

## Sơ đồ tổng quan

![Kiến trúc AWS — Mini E-commerce DevOps Platform](../assets/aws-platform-architecture.png)

*Hình trên tóm tắt ba giai đoạn: **Source → CI**, **Build & Deploy**, **Platform**. Chi tiết kỹ thuật còn có trong [architecture.md](../architecture.md).*

---

## Mục tiêu thiết kế

Dự án hướng tới **Approach A (platform shell)**:

- **Tối đa** câu chuyện DevOps: IaC, pipeline, GitOps, secrets, monitoring.
- **Tối thiểu** chỉnh sửa ứng dụng gốc — giữ semantics upstream (catalog in-memory, cart trên Redis).

Môi trường AWS là **một region duy nhất** (`ap-southeast-1`), **một node group EKS**, phù hợp demo portfolio và chi phí kiểm soát. Stack được coi là **ephemeral**: dựng khi cần demo, `terraform destroy` khi không dùng.

---

## Hai repository, hai vai trò

| Repository | Vai trò |
|------------|---------|
| **mini-ecommerce-devops** (repo app) | Mã nguồn `src/`, Terraform `infra/`, Docker Compose local, GitHub Actions |
| **mini-ecommerce-gitops** | Manifest Kubernetes (Kustomize `base/` + overlay `aws/`), Argo CD Application |

Luồng artifact rõ ràng: **CI build image → đẩy ECR → GitOps trỏ tag → Argo CD sync lên cluster**. Tách repo giúp quyền và vòng đời deploy độc lập với mã ứng dụng — mô hình gần với production thực tế.

---

## Ba luồng chính trên AWS

### ① Source → CI (GitHub vào AWS)

Developer làm việc trên **App Repository** (`src/`, `infra/`, workflows). Mỗi push hoặc pull request kích hoạt **GitHub Actions**: build image, quét Trivy, và trên PR chạy `terraform plan` (chỉ plan — không apply trong CI).

Xác thực lên AWS dùng **GitHub OIDC** → role IAM chuyên cho pipeline → **Amazon ECR**. Không lưu access key dài hạn trong GitHub Secrets cho ECR push — đây là điểm nhấn bảo mật của dự án.

Song song, **GitOps Repository** chứa manifest Kustomize; nó không build image nhưng là nguồn sự thật cho trạng thái cluster mong muốn.

### ② Build & Deploy (ECR và EKS)

Sau khi image có trên ECR, cluster **Amazon EKS** pull image theo tag mà GitOps khai báo. **Argo CD** theo dõi GitOps repo và **sync** manifest xuống namespace — deploy declarative, có thể audit và rollback qua Git.

Trong cluster, **AWS Load Balancer Controller** (LBC) ánh xạ Ingress Kubernetes sang **Application Load Balancer** bên ngoài VPC. Phase 1 không dùng Route 53/ACM tùy chỉnh; hostname ALB là điể vào công khai.

### ③ Platform (secrets, dữ liệu nền, quan sát, IaC)

Các dịch vụ “nền” bọc quanh workload:

| Thành phần | Chức năng |
|-----------|-----------|
| **Secrets Manager** | Credential RDS và secret platform |
| **External Secrets Operator** | Đồng bộ secret vào cluster qua **IRSA** |
| **Amazon RDS** (PostgreSQL 16) | **Platform database** — học DevOps & sẵn sàng tích hợp sau |
| **CloudWatch** | Alarm RDS, metrics (Terraform module observability) |
| **Terraform + S3 remote state** | Provision VPC, EKS, ECR, RDS… — **apply thủ công** từ `infra/environments/aws` |

**Lưu ý quan trọng (Phase 1):** RDS được provision như platform DB; microservices happy-path vẫn dùng **Redis** (cart) và **catalog in-memory** như bản gốc. Đường nối app → RDS là hướng phát triển, chưa phải luồng runtime bắt buộc trong phase này.

---

## Luồng traffic runtime

Khi hệ thống đã deploy:

```
Users → ALB → AWS LBC (Ingress) → frontend → … → checkoutservice
                                              ↘ Redis (cart)
```

Chuỗi microservices **Phase 1** trên EKS:

1. **frontend** — UI web  
2. **productcatalogservice** — API sản phẩm (in-memory)  
3. **cartservice** — giỏ hàng (**Redis** in-cluster)  
4. **checkoutservice** — điều phối đặt hàng  

**Local Docker Compose** chạy thêm currency, shipping, payment, email để checkout đầy đủ trên máy dev; các service đó **không** nằm trong overlay deploy EKS Phase 1.

---

## Developer workstation: local và cloud

Kiến trúc không chỉ tồn tại trên cloud. Trên máy dev:

| Công cụ | Việc làm |
|---------|----------|
| **Docker Compose** | Chạy happy-path (+ service phụ) tại `localhost:8080` |
| **Terraform CLI** | `plan` / `apply` / `destroy` stack AWS (apply không qua CI) |
| **kubectl / argocd CLI** | Kiểm tra cluster, sync, debug |

Đây là vòng lặp học tập: chỉnh code local → push → CI → GitOps → EKS; hoặc chỉnh `infra/` → plan trên PR → apply tay khi đã review `tfplan`.

---

## Bảo mật và vận hành IaC

Một vài nguyên tắc “cứng” của repo:

1. **`terraform apply` không chạy trong CI** — chỉ `plan` trên PR; apply từ laptop sau khi xem plan.  
2. **GitHub OIDC** cho ECR (nhánh `main`) và role plan riêng cho PR.  
3. **IRSA** cho LBC và External Secrets — pod không cần key AWS tĩnh.  
4. **Secret**: Secrets Manager + ESO trên EKS; local dùng `.env` từ `.env.example` (không commit `.env`).  
5. **State**: bootstrap S3 + DynamoDB lock (`infra/bootstrap/state`).

Các quyết định này ưu tiên **an toàn mặc định** và câu chuyện portfolio rõ ràng hơn là tối ưu tốc độ deploy.

---

## Quan sát hệ thống (Observability)

**Phase 4** bổ sung:

- **CloudWatch** — alarm RDS (Terraform module `observability-cloudwatch`).  
- **kube-prometheus-stack** trên EKS — Prometheus scrape pod, Grafana dashboard (ví dụ `cluster-overview`).  

Luồng: workload phát metrics/logs → Prometheus/CloudWatch → Grafana hoặc alarm. Script `scripts/verify-phase4.ps1` và `scripts/run-phase4-e2e.ps1` giúp xác nhận end-to-end sau khi stack lên.

---

## Trade-off và hướng mở rộng

| Chọn | Lợi | Giá |
|------|-----|-----|
| Happy-path thay vì full demo | Chi phí EKS/ECR thấp, diagram dễ hiểu | Không showcase payment/shipping trên AWS |
| RDS platform, chưa gắn app | Học provision DB, secret, alarm sớm | Cần phase sau để nối service → RDS |
| Một region, một node group | Đơn giản, rẻ | Không HA multi-AZ “thật” |
| ALB hostname thô | Không phụ thuộc DNS/ACM | URL demo xấu, không TLS custom |

Hướng mở rộng tự nhiên: thêm service vào GitOps overlay, ACM + Route 53, tích hợp app với RDS, multi-environment (staging/prod), và vẫn giữ ranh giới **plan trong CI, apply ngoài CI**.

---

## Kết luận

**Mini E-commerce DevOps Platform** không phải một cửa hàng monolith trên AWS — mà là **khung DevOps** bọc microservices Online Boutique: GitHub đưa code và image vào AWS, Argo CD giữ cluster khớp Git, ALB đưa người dùng vào frontend, và lớp platform (RDS, Secrets Manager, CloudWatch, Terraform) hỗ trợ vận hành có chủ đích.

Nếu bạn đang đọc để tái hiện hoặc trình bày portfolio, thứ tự đề xuất:

1. Đọc sơ đồ [aws-platform-architecture.png](../assets/aws-platform-architecture.png).  
2. Chạy local: `docker compose up` (xem [README.md](../../README.md)).  
3. Dựng AWS theo [aws-up.md](../runbooks/aws-up.md), teardown [aws-down.md](../runbooks/aws-down.md).  
4. Cấu hình CI: [github-actions-setup.md](../runbooks/github-actions-setup.md).

---

**Tài liệu liên quan**

- [architecture.md](../architecture.md) — sơ đồ Mermaid và bảng service  
- [observability.md](../runbooks/observability.md) — Prometheus/Grafana/CloudWatch  
- [demo-checklist.md](../runbooks/demo-checklist.md) — kịch bản demo  

*Viết cho dự án Mini E-commerce DevOps Platform — portfolio DevOps trên AWS.*
