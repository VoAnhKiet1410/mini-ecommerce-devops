/**
 * Generate docs/architecture-overview-vi.docx
 * Mini E-commerce DevOps Platform — Mô tả kiến trúc (Tiếng Việt)
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, LevelFormat,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ── Colors ──────────────────────────────────────────────────────────────
const COLOR_HEADING  = "1A3C6E";
const COLOR_ACCENT   = "1F6FEB";
const COLOR_TABLE_HD = "1A3C6E";
const COLOR_TABLE_AL = "EEF4FF";

// ── Helpers ──────────────────────────────────────────────────────────────
const border   = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders  = { top: border, bottom: border, left: border, right: border };
const hdBorder = { style: BorderStyle.SINGLE, size: 1, color: "1A3C6E" };
const hdBorders = { top: hdBorder, bottom: hdBorder, left: hdBorder, right: hdBorder };

function cell(text, opts = {}) {
  const { bg = "FFFFFF", width = 4680, isHeader = false } = opts;
  return new TableCell({
    borders: isHeader ? hdBorders : borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: isHeader ? COLOR_TABLE_HD : bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: isHeader,
        color: isHeader ? "FFFFFF" : "222222",
        font: "Arial",
        size: isHeader ? 20 : 19,
      })],
    })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: COLOR_HEADING })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: COLOR_HEADING })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: "444444" })],
  });
}

function para(runs) {
  const children = Array.isArray(runs)
    ? runs.map(r => typeof r === "string"
        ? new TextRun({ text: r, font: "Arial", size: 20, color: "222222" })
        : new TextRun({ font: "Arial", size: 20, color: "222222", ...r }))
    : [new TextRun({ text: runs, font: "Arial", size: 20, color: "222222" })];
  return new Paragraph({ spacing: { after: 120 }, children });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "222222" })],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT, space: 8 } },
    indent: { left: 280 },
    children: [new TextRun({ text, font: "Arial", size: 18, color: "555555", italics: true })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
    children: [new TextRun("")],
  });
}

function imgPara(filename, wPx, hPx, altText) {
  const imgPath = path.join(__dirname, filename);
  if (!fs.existsSync(imgPath)) return para(`[Ảnh không tìm thấy: ${filename}]`);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 160 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(imgPath),
      transformation: { width: wPx, height: hPx },
      altText: { title: altText, description: altText, name: altText },
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { isHeader: true, width: colWidths[i] })),
  });
  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((v, ci) => cell(v, {
        width: colWidths[ci],
        bg: ri % 2 === 0 ? "FFFFFF" : COLOR_TABLE_AL,
      })),
    })
  );
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ════════════════════════════════════════════════════════════════════════
// NỘI DUNG
// ════════════════════════════════════════════════════════════════════════
const children = [

  // ─── TRANG BÌA ───────────────────────────────────────────────────────
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1440, after: 240 },
    children: [new TextRun({
      text: "Mini E-commerce DevOps Platform",
      font: "Arial", size: 52, bold: true, color: COLOR_HEADING,
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({
      text: "Mô tả kiến trúc & Quyết định thiết kế",
      font: "Arial", size: 28, color: "444444",
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    children: [new TextRun({
      text: "AWS ap-southeast-1  |  EKS + GitOps + CI/CD + Observability",
      font: "Arial", size: 22, color: "666666", italics: true,
    })],
  }),
  divider(),
  spacer(),

  // ─── 1. TỔNG QUAN DỰ ÁN ──────────────────────────────────────────────
  h1("1. Tổng quan dự án"),
  para("Tài liệu này mô tả kiến trúc của Mini E-commerce DevOps Platform — dự án portfolio nhằm chứng minh năng lực DevOps end-to-end trên AWS. Nền tảng bọc quanh ứng dụng Google Online Boutique (chỉ chạy happy-path services) và xây toàn bộ hạ tầng DevOps lên trên."),
  spacer(),
  para([
    { text: "Mục tiêu chính: ", bold: true },
    "Chứng minh năng lực Cloud/DevOps Intern — IaC, CI/CD, GitOps, observability, secrets management và supply-chain security — sử dụng AWS theo mô hình ephemeral (bật khi demo, tắt sau khi xong).",
  ]),
  spacer(),
  note("Mô hình ephemeral: tài nguyên AWS được tạo trước buổi demo và huỷ bằng terraform destroy sau khi xong. Chi phí chỉ phát sinh khi stack đang chạy (~$200/tháng)."),
  spacer(),

  makeTable(
    ["Lớp", "Công nghệ"],
    [
      ["Cloud Provider", "AWS ap-southeast-1 (Singapore)"],
      ["IaC (Hạ tầng dưới dạng code)", "Terraform >= 1.5 (module hoá)"],
      ["Điều phối container", "Kubernetes EKS v1.30"],
      ["CI/CD", "GitHub Actions + OIDC (không dùng static key)"],
      ["GitOps", "Argo CD + Kustomize (mô hình 2 repo)"],
      ["Quan sát hệ thống", "Prometheus, Grafana, CloudWatch"],
      ["Quản lý bí mật", "AWS Secrets Manager + External Secrets Operator"],
      ["Bảo mật chuỗi cung ứng", "Trivy (quét image), Checkov (IaC), cosign + SBOM"],
      ["Ngôn ngữ ứng dụng", "Go, C# .NET, Node.js, Python (giao tiếp qua gRPC)"],
    ],
    [3600, 5760]
  ),
  spacer(),
  spacer(),

  // ─── 2. HAI SƠ ĐỒ KIẾN TRÚC ─────────────────────────────────────────
  h1("2. Sơ đồ kiến trúc"),
  para("Kiến trúc được thể hiện qua hai sơ đồ bổ sung cho nhau, mỗi sơ đồ trả lời một câu hỏi khác nhau:"),
  spacer(),

  makeTable(
    ["Sơ đồ", "Trả lời câu hỏi", "File"],
    [
      ["Kiến trúc logic (Logical)", "Có những service nào? Request đi qua đâu? CI/CD, GitOps và secrets hoạt động thế nào?", "architecture-diagram.png"],
      ["Sơ đồ mạng (Network)", "Tài nguyên nằm ở subnet nào trong VPC? Traffic vào/ra qua đâu? Public hay private?", "architecture-network.png"],
    ],
    [2400, 5160, 1800]
  ),
  spacer(),

  h2("2.1 Sơ đồ kiến trúc logic"),
  para("Sơ đồ logic dùng màu sắc để phân biệt bốn luồng song song. Người đọc theo dõi mũi tên theo số thứ tự trong mỗi luồng."),
  spacer(),

  makeTable(
    ["Màu", "Luồng", "Đánh số", "Mô tả"],
    [
      ["Xanh dương", "Luồng request runtime", "1 -> 5", "HTTP từ trình duyệt -> ALB -> Ingress -> Service -> frontend pod -> gRPC tới các backend"],
      ["Tím", "Service mesh nội bộ", "(không số)", "Các lời gọi gRPC đồng bộ giữa microservices và kết nối TCP tới Redis"],
      ["Hồng", "Pipeline CI/CD", "A -> F", "Developer git push -> GitHub Actions build image, ký, push lên ECR, mở image-bump PR"],
      ["Xanh lá", "GitOps sync", "(A -> F tiếp)", "Argo CD poll repo gitops, sync Kustomize overlay, apply manifests vào namespace boutique"],
      ["Đỏ", "Luồng bí mật (Secrets)", "(không số)", "ESO đọc Secrets Manager qua IRSA, ghi K8s Secret vào namespace"],
      ["Cam", "Quan sát hệ thống", "(không số)", "Prometheus scrape /metrics, CloudWatch nhận alarm từ RDS và ALB"],
      ["Xám", "Terraform / Hạ tầng", "(không số)", "GitHub Actions plan (read-only), developer apply thủ công, state lưu trên S3 + DynamoDB"],
    ],
    [900, 2000, 1200, 5260]
  ),
  spacer(),

  imgPara("architecture-diagram.png", 620, 780, "So do kien truc logic"),
  spacer(),

  h2("2.2 Sơ đồ mạng (Network Topology)"),
  para("Sơ đồ mạng thể hiện vị trí vật lý của các tài nguyên bên trong VPC, trải qua hai Availability Zone, với hai tầng subnet public và private."),
  spacer(),
  imgPara("architecture-network.png", 500, 500, "So do mang VPC"),
  spacer(),
  spacer(),

  // ─── 3. MÔ TẢ CÁC THÀNH PHẦN ─────────────────────────────────────────
  h1("3. Mô tả các thành phần"),
  note("Tất cả giá trị trong phần này được xác minh trực tiếp từ code Terraform trong thư mục infra/. Không có thông tin nào được giả định."),
  spacer(),

  // 3.1 VPC & Mạng
  h2("3.1 VPC và cấu trúc mạng"),
  para("VPC trải qua hai Availability Zone (ap-southeast-1a và ap-southeast-1b) — số lượng tối thiểu mà EKS yêu cầu. Tài nguyên được chia thành hai tầng subnet:"),
  spacer(),
  makeTable(
    ["Tầng subnet", "CIDR", "AZ", "Chứa gì"],
    [
      ["Public 1a", "10.0.101.0/24", "ap-southeast-1a", "ALB ENI, NAT Gateway (duy nhất)"],
      ["Public 1b", "10.0.102.0/24", "ap-southeast-1b", "ALB ENI (không có NAT ở đây)"],
      ["Private 1a", "10.0.1.0/24", "ap-southeast-1a", "EKS managed node (1x m7i-flex.large), RDS PostgreSQL"],
      ["Private 1b", "10.0.2.0/24", "ap-southeast-1b", "Dự phòng — EKS cần >=2 private subnet; hiện chưa có node hay RDS"],
    ],
    [1600, 1800, 2000, 3960]
  ),
  spacer(),

  h3("NAT Gateway — Thiết kế một cổng duy nhất"),
  para("Chỉ có một NAT Gateway được triển khai, đặt ở public subnet 1a. Cả hai private subnet đều định tuyến traffic ra ngoài (0.0.0.0/0) qua NAT duy nhất này."),
  spacer(),
  makeTable(
    ["Khía cạnh", "Chi tiết"],
    [
      ["Cấu hình", "single_nat_gateway = true trong Terraform VPC module"],
      ["Chi phí", "~$32/tháng (1 NAT) so với ~$64/tháng (2 NAT, mỗi AZ 1 cái)"],
      ["Đánh đổi", "Nếu AZ 1a lỗi, private subnet 1b cũng mất egress (vì NAT nằm ở AZ 1a)"],
      ["Lý do chấp nhận", "Demo ephemeral — không cần HA cho egress. Production sẽ dùng 1 NAT mỗi AZ."],
      ["Traffic qua NAT", "EKS node kéo image từ ECR, gọi AWS API, tải package"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.2 EKS
  h2("3.2 Amazon EKS Cluster"),
  para("Cluster Kubernetes là nền tảng compute trung tâm. Workload ứng dụng, các operator GitOps, và stack observability đều chạy tại đây."),
  spacer(),
  makeTable(
    ["Thuộc tính", "Giá trị"],
    [
      ["Tên cluster", "mini-ecommerce-devops"],
      ["Phiên bản Kubernetes", "1.30"],
      ["API endpoint", "Public + Private (cả hai bật)"],
      ["CIDR public access", "0.0.0.0/0 (mở hoàn toàn — nên giới hạn về IP cá nhân trên production)"],
      ["Loại node group", "Managed node group (AWS quản lý vòng đời)"],
      ["Instance type", "m7i-flex.large (Intel Flex — burstable, 2 vCPU / 8 GB RAM)"],
      ["Loại capacity", "ON_DEMAND (không dùng Spot — tránh bị preempt giữa demo)"],
      ["Số lượng node", "desired = 1, min = 1, max = 1 (cố định, không có autoscaling)"],
      ["Chi phí node", "~$71/tháng (ON_DEMAND, ap-southeast-1)"],
      ["OIDC provider", "Tự động tạo — cho phép IRSA cho LBC và ESO"],
      ["Control plane logging", "Không bật (CloudWatch log tốn tiền, không cần cho demo)"],
    ],
    [3200, 6160]
  ),
  spacer(),

  h3("Các namespace trong cluster"),
  makeTable(
    ["Namespace", "Mục đích", "Workload chính"],
    [
      ["kube-system", "Các operator nền tảng", "AWS Load Balancer Controller, CoreDNS, kube-proxy, vpc-cni"],
      ["external-secrets", "Operator quản lý bí mật", "External Secrets Operator"],
      ["argocd", "Controller GitOps", "Argo CD server, repo-server, application-controller"],
      ["boutique", "Workload ứng dụng", "frontend, productcatalog, cartservice, checkout, Redis"],
      ["monitoring", "Stack quan sát hệ thống", "Prometheus, Grafana (Helm chart kube-prometheus-stack)"],
    ],
    [2200, 2800, 4360]
  ),
  spacer(),

  // 3.3 Services
  h2("3.3 Các service ứng dụng (namespace: boutique)"),
  para("Chỉ các happy-path services được deploy lên EKS. Service mesh đầy đủ (currency, shipping, payment, email) chỉ chạy trong Docker Compose phục vụ local development."),
  spacer(),
  makeTable(
    ["Service", "Ngôn ngữ", "Port", "Giao thức", "Lưu trữ", "Có trên EKS?"],
    [
      ["frontend", "Go", "8080", "HTTP (vào), gRPC (ra)", "Không — điều phối backend", "Có"],
      ["productcatalogservice", "Go", "3550", "gRPC", "In-memory (products.json)", "Có"],
      ["cartservice", "C# .NET", "7070", "gRPC", "Redis :6379 (in-cluster)", "Có"],
      ["checkoutservice", "Go", "5050", "gRPC", "Không — orchestrator", "Có"],
      ["Redis", "Redis", "6379", "TCP", "In-memory (ephemeral)", "Có (Deployment nội cluster)"],
      ["currencyservice", "Node.js", "7000", "gRPC", "currency_conversion.json", "Không — Compose only"],
      ["paymentservice", "Node.js", "50051", "gRPC", "Không (mock)", "Không — Compose only"],
      ["emailservice", "Python", "8080", "gRPC", "Không (mock)", "Không — Compose only"],
      ["shippingservice", "Go", "50051", "gRPC", "Không (mock)", "Không — Compose only"],
    ],
    [2000, 1200, 900, 1800, 2200, 1260]
  ),
  spacer(),
  note("Redis là Kubernetes Deployment nội cluster — KHÔNG phải AWS ElastiCache. Đây là lựa chọn có chủ đích: dữ liệu giỏ hàng không cần persisted cho scope demo này."),
  spacer(),

  h3("Các lời gọi dịch vụ từ frontend"),
  para("Frontend gọi nhiều backend mỗi lần tải trang. Trên EKS chỉ các happy-path service có mặt và phản hồi. Trên Docker Compose tất cả service đều có."),
  spacer(),
  makeTable(
    ["frontend gọi tới", "Port", "Mục đích", "Có trên EKS?"],
    [
      ["productcatalogservice", "3550", "Liệt kê sản phẩm, lấy chi tiết sản phẩm", "Có"],
      ["cartservice", "7070", "Thêm/xem/xoá giỏ hàng", "Có"],
      ["checkoutservice", "5050", "Đặt hàng", "Có"],
      ["currencyservice", "7000", "Chuyển đổi tiền tệ", "Không (Compose only)"],
      ["shippingservice", "50051", "Tính phí vận chuyển", "Không (Compose only)"],
      ["recommendationservice", "8080", "Gợi ý sản phẩm", "Không (chưa deploy ở đâu)"],
      ["adservice", "9555", "Hiển thị quảng cáo", "Không (chưa deploy ở đâu)"],
    ],
    [2600, 900, 2900, 1960]
  ),
  spacer(),

  h3("Các lời gọi dịch vụ từ checkoutservice"),
  makeTable(
    ["checkoutservice gọi tới", "Port", "Mục đích", "Có trên EKS?"],
    [
      ["cartservice", "7070", "GetCart, EmptyCart", "Có"],
      ["productcatalogservice", "3550", "GetProduct (từng item trong giỏ)", "Có"],
      ["currencyservice", "7000", "Chuyển đổi giá tiền", "Không (Compose only)"],
      ["shippingservice", "50051", "GetQuote, ShipOrder", "Không (Compose only)"],
      ["paymentservice", "50051", "Charge thẻ tín dụng (mock)", "Không (Compose only)"],
      ["emailservice", "8080", "Gửi email xác nhận đơn hàng (mock)", "Không (Compose only)"],
    ],
    [2600, 900, 2900, 1960]
  ),
  spacer(),

  // 3.4 ALB
  h2("3.4 Application Load Balancer (ALB)"),
  para([
    "ALB ",
    { text: "KHÔNG được tạo bởi Terraform", bold: true },
    ". Nó được tạo động bởi AWS Load Balancer Controller (LBC) — LBC theo dõi các Ingress object trong Kubernetes và tự tạo/cập nhật ALB tương ứng trên AWS.",
  ]),
  spacer(),
  makeTable(
    ["Khía cạnh", "Chi tiết"],
    [
      ["Ai tạo ra ALB", "AWS Load Balancer Controller phản ứng với Ingress object trong namespace boutique"],
      ["Khi nào được tạo", "Sau khi Argo CD apply manifest Ingress lên cluster (Phase 3 trở đi)"],
      ["Loại ALB", "Internet-facing (public)"],
      ["Subnets", "Cả hai public subnet (10.0.101.0/24, 10.0.102.0/24) — tagged kubernetes.io/role/elb=1"],
      ["Target", "EKS node trên port 8080 (frontend pod)"],
      ["Terraform liên quan", "Không có — Terraform chỉ tạo IAM role cho LBC (IRSA)"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.5 RDS
  h2("3.5 RDS PostgreSQL"),
  para([
    "RDS được provisioned như một ",
    { text: "platform DB shell", bold: true },
    " — tồn tại để chứng minh khả năng IaC đầy đủ nhưng ",
    { text: "không được dùng bởi bất kỳ service ứng dụng nào", bold: true },
    ". Các service dùng Redis (giỏ hàng) và in-memory storage, theo đúng kiến trúc upstream của Online Boutique.",
  ]),
  spacer(),
  makeTable(
    ["Thuộc tính", "Giá trị"],
    [
      ["Engine", "PostgreSQL 16"],
      ["Instance class", "db.t4g.micro (Graviton2, 1 vCPU, 1 GB RAM)"],
      ["Chi phí", "~$13/tháng (single-AZ, ap-southeast-1)"],
      ["Lưu trữ", "20 GB gp3 (mã hóa at-rest)"],
      ["Multi-AZ", "Không — single-AZ (chỉ AZ 1a)"],
      ["Đánh đổi HA", "Nếu AZ 1a lỗi -> DB không khả dụng. Chấp nhận được vì demo ephemeral và app không dùng RDS."],
      ["Truy cập public", "Không — chỉ trong private subnet"],
      ["Backup retention", "1 ngày (tối thiểu — không tạo final snapshot khi destroy)"],
      ["Deletion protection", "Tắt (cho phép terraform destroy không cần can thiệp thủ công)"],
      ["Thông tin đăng nhập", "Mật khẩu random 24 ký tự, lưu trên Secrets Manager, đồng bộ vào cluster qua ESO"],
    ],
    [3000, 6360]
  ),
  spacer(),

  // 3.6 Secrets flow
  h2("3.6 Luồng quản lý bí mật (Secrets)"),
  para("Luồng secrets đảm bảo không có thông tin xác thực nào được hard-code ở bất cứ đâu — không trong code, không trong Kubernetes manifest, không trong GitHub Actions."),
  spacer(),
  makeTable(
    ["Bước", "Thành phần", "Hành động"],
    [
      ["1", "Terraform (apply thủ công)", "Tạo RDS, sinh mật khẩu random, lưu vào Secrets Manager dưới dạng JSON: {username, password, host, port, dbname}"],
      ["2", "External Secrets Operator", "Chạy trong EKS với IRSA role (secretsmanager:GetSecretValue). Theo dõi ExternalSecret CR trong namespace boutique."],
      ["3", "ExternalSecret CR", "Argo CD apply manifest này. CR tham chiếu đường dẫn secret trên Secrets Manager và ánh xạ key vào K8s Secret."],
      ["4", "K8s Secret", "ESO tạo/đồng bộ K8s Secret trong namespace boutique. Pod mount dưới dạng biến môi trường hoặc volume."],
      ["5", "GitHub Actions", "Dùng GitHub OIDC assume IAM role (không có AWS_ACCESS_KEY_ID lưu trên GitHub). Trust bị giới hạn theo nhánh main (ECR push) hoặc PR (TF plan)."],
    ],
    [600, 2400, 6360]
  ),
  spacer(),

  // 3.7 CI/CD
  h2("3.7 Pipeline CI/CD (GitHub Actions)"),
  para("Có ba workflow được định nghĩa. Chỉ terraform-plan chạy trên CI — terraform apply luôn chạy thủ công trên máy developer để tránh thay đổi hạ tầng ngoài ý muốn."),
  spacer(),
  makeTable(
    ["Workflow", "Trigger", "Các bước", "IAM Role sử dụng"],
    [
      ["ci-build-push", "Push lên main, chạm vào src/**", "1. Checkout  2. OIDC assume ECR-push role  3. Docker Buildx  4. Trivy gate CRITICAL (fail nếu phát hiện)  5. cosign ký + SBOM  6. Push lên ECR (tag sha + latest)  7. Mở image-bump PR sang gitops repo", "github-actions-ecr (chỉ nhánh main)"],
      ["terraform-plan", "PR chạm vào infra/**", "1. OIDC assume TF-plan role (read-only)  2. terraform fmt -check  3. terraform validate  4. terraform plan  5. Checkov scan (baseline)  6. Post sticky comment lên PR với plan output", "github-actions-terraform-plan (chỉ PR, read-only)"],
      ["security-scan", "Lịch Thứ 2 06:00 UTC + PR", "1. Checkov trên terraform/ và K8s manifests  2. Trivy fs scan (HIGH+CRITICAL)  3. Upload SARIF lên GitHub Security", "Không (chỉ đọc repo)"],
    ],
    [1800, 1600, 4000, 1960]
  ),
  spacer(),
  note("terraform apply KHÔNG được tự động hoá từ CI. Developer chạy thủ công: cd infra/environments/aws && terraform apply tfplan. Đây là quyết định có chủ đích để ngăn thay đổi hạ tầng ngoài ý muốn."),
  spacer(),

  // 3.8 GitOps
  h2("3.8 GitOps (Argo CD + Kustomize)"),
  para("Mô hình 2 repo tách biệt source code ứng dụng khỏi deployment manifests. CI build và ký image; GitOps quản lý những gì được deploy lên cluster."),
  spacer(),
  makeTable(
    ["Repository", "Chứa gì", "Ai ghi vào"],
    [
      ["mini-ecommerce-devops (repo này)", "Source code src/, Terraform infra/, CI workflows, runbooks", "Developer (git push), CI (terraform-plan comment)"],
      ["mini-ecommerce-gitops (repo riêng)", "Kustomize base/ + overlays/aws/ với ECR image tags", "CI mở image-bump PR sau mỗi build thành công; developer merge"],
    ],
    [2800, 3600, 2960]
  ),
  spacer(),
  makeTable(
    ["Khía cạnh GitOps", "Chi tiết"],
    [
      ["Phương thức sync", "Argo CD poll mini-ecommerce-gitops mỗi 3 phút (pull model — KHÔNG phải webhook)"],
      ["Định dạng manifest", "Kustomize overlay aws/ chồng lên base/"],
      ["Luồng cập nhật image", "CI push lên ECR -> mở PR vào gitops repo với image tag mới -> developer merge -> Argo CD nhận diện ở lần poll tiếp theo"],
      ["Deploy trigger", "Argo CD phát hiện diff giữa trạng thái cluster và git, apply các resource còn thiếu/thay đổi"],
      ["Namespace deploy tới", "boutique (app pod, Ingress, Service, ExternalSecret)"],
      ["Argo CD KHÔNG deploy", "Các operator (LBC, ESO, Prometheus) — cài trước qua Helm scripts trước khi Argo CD được cấu hình"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.9 Observability
  h2("3.9 Quan sát hệ thống (Observability)"),
  para("Stack observability kết hợp metrics trong cluster (Prometheus + Grafana) với alarm AWS native (CloudWatch). Distributed tracing đã được code sẵn nhưng chưa kích hoạt."),
  spacer(),
  makeTable(
    ["Thành phần", "Loại", "Theo dõi gì", "Trạng thái"],
    [
      ["Prometheus", "In-cluster (kube-prometheus-stack)", "CPU/RAM pod, K8s events, endpoint /metrics của app pods", "Đã deploy"],
      ["Grafana", "In-cluster (kube-prometheus-stack)", "Dashboard: cluster-overview.json (custom) + dashboard K8s mặc định", "Đã deploy"],
      ["CloudWatch Alarm: RDS CPU", "AWS managed", "RDS CPUUtilization > 80% trong 2 period 5 phút", "Kích hoạt (không có SNS action — demo)"],
      ["CloudWatch Alarm: RDS Storage", "AWS managed", "RDS FreeStorageSpace < 2 GB trong 2 period 5 phút", "Kích hoạt (không có SNS action — demo)"],
      ["CloudWatch Alarm: ALB 5xx", "AWS managed", "ALB HTTPCode_Target_5XX_Count > 10 mỗi 5 phút", "Kích hoạt sau khi ALB được provisioned"],
      ["OTel Collector", "Lên kế hoạch — chưa deploy", "Distributed traces từ frontend (OTLP). Code đã wired trong src/frontend/main.go", "Không hoạt động: ENABLE_TRACING=0"],
    ],
    [2400, 2000, 3200, 1760]
  ),
  spacer(),

  // 3.10 ECR
  h2("3.10 Amazon ECR"),
  makeTable(
    ["Repository", "Quét khi push", "Lifecycle Policy", "Ký image"],
    [
      ["mini-ecommerce/frontend", "Có (báo cáo HIGH+CRITICAL)", "Xoá image untagged sau 7 ngày", "cosign + SBOM (bước 5 CI)"],
      ["mini-ecommerce/productcatalogservice", "Có", "Xoá image untagged sau 7 ngày", "cosign + SBOM"],
      ["mini-ecommerce/cartservice", "Có", "Xoá image untagged sau 7 ngày", "cosign + SBOM"],
      ["mini-ecommerce/checkoutservice", "Có", "Xoá image untagged sau 7 ngày", "cosign + SBOM"],
    ],
    [3200, 1800, 2400, 1960]
  ),
  spacer(),
  spacer(),

  // ─── 4. PHÂN TÍCH CHI PHÍ ────────────────────────────────────────────
  h1("4. Phân tích chi phí (khi đang chạy)"),
  note("Mô hình ephemeral: terraform destroy sau mỗi demo đưa chi phí về $0. Các con số dưới đây chỉ áp dụng khi stack đang hoạt động."),
  spacer(),
  makeTable(
    ["Tài nguyên", "Cấu hình", "Chi phí / tháng", "Tối ưu đã áp dụng"],
    [
      ["EKS Control Plane", "Managed (AWS quản lý master nodes)", "~$73", "Cố định — không thể giảm"],
      ["EKS Node", "1x m7i-flex.large ON_DEMAND", "~$71", "ON_DEMAND để demo ổn định (Spot tiết kiệm ~65% nhưng có thể bị preempt)"],
      ["NAT Gateway", "1 gateway + data transfer", "~$32", "Single NAT (không phải per-AZ) tiết kiệm ~$32/tháng"],
      ["RDS PostgreSQL", "db.t4g.micro single-AZ 20GB gp3", "~$13", "Graviton2 tier nhỏ nhất; single-AZ tiết kiệm ~$13/tháng"],
      ["ECR", "4 repo, storage + transfer", "~$3", "Lifecycle policy xoá untagged sau 7 ngày"],
      ["S3 + DynamoDB (state)", "Versioned bucket + lock table", "~$1", "DynamoDB PAY_PER_REQUEST"],
      ["CloudWatch Alarms", "3 alarm, không có log group", "~$1", "Không bật control plane logs (~$5-10/tháng nếu bật)"],
      ["Data transfer", "ECR pull, ALB, misc", "~$5-15", "S3 Gateway Endpoint sẽ loại bỏ chi phí pull ECR qua NAT"],
      ["TỔNG ƯỚC TÍNH", "", "~$200-210/tháng", "Destroy khi xong -> $0"],
    ],
    [2400, 2600, 1560, 2800]
  ),
  spacer(),

  h2("4.1 Tối ưu chi phí đã áp dụng"),
  bullet("Single NAT Gateway (single_nat_gateway = true) — tiết kiệm ~$32/tháng so với per-AZ"),
  bullet("RDS db.t4g.micro Graviton2 — tier RDS rẻ nhất (~$13/tháng)"),
  bullet("RDS Single-AZ — tiết kiệm ~$13/tháng so với Multi-AZ"),
  bullet("Số node cố định (1) — không có node capacity thừa"),
  bullet("gp3 storage — rẻ hơn gp2 ~20% với cùng hiệu năng"),
  bullet("ECR lifecycle policy — ngăn lưu trữ phình to do image cũ"),
  bullet("DynamoDB PAY_PER_REQUEST cho state lock — không provisioned capacity"),
  bullet("Không bật CloudWatch control plane logs — tiết kiệm $5-10/tháng"),
  spacer(),

  h2("4.2 Tối ưu thêm có thể áp dụng (chưa làm — lý do)"),
  makeTable(
    ["Tối ưu", "Tiết kiệm", "Đánh đổi / Lý do chưa làm"],
    [
      ["Chuyển EKS node sang Spot instances", "~$46/tháng (tiết kiệm 65%)", "Spot có thể bị AWS preempt. Demo cần cluster 1-node ổn định."],
      ["Thêm S3 Gateway VPC Endpoint (miễn phí)", "Loại bỏ chi phí data qua NAT khi kéo ECR image", "Tiết kiệm nhỏ — chưa implement. Miễn phí, nên thêm sau."],
      ["Xoá RDS hoàn toàn", "~$13/tháng", "RDS là platform DB shell — chứng minh năng lực IaC. Xoá đi mất điểm portfolio."],
    ],
    [2800, 1800, 4760]
  ),
  spacer(),
  spacer(),

  // ─── 5. QUYẾT ĐỊNH THIẾT KẾ ──────────────────────────────────────────
  h1("5. Các quyết định thiết kế quan trọng"),

  h2("5.1 Không dùng AWS credentials tĩnh"),
  para("GitHub Actions dùng GitHub OIDC để assume IAM role lúc runtime. Không có AWS_ACCESS_KEY_ID hay AWS_SECRET_ACCESS_KEY nào được lưu trong GitHub Secrets."),
  bullet("ECR-push role: chỉ tin tưởng refs/heads/main (commit trên nhánh main)"),
  bullet("TF-plan role: chỉ tin tưởng pull_request events (quyền read-only)"),
  bullet("Operator EKS (LBC, ESO) dùng IRSA — IAM role gắn vào K8s service account qua OIDC"),
  spacer(),

  h2("5.2 terraform apply là thủ công — không bao giờ tự động hoá"),
  para("CI workflow chỉ chạy terraform plan trên PR (read-only). Terraform apply luôn được chạy thủ công từ máy developer. Điều này ngăn thay đổi hạ tầng ngoài ý muốn do code push gây ra."),
  spacer(),

  h2("5.3 Mô hình GitOps 2 repo"),
  para("Source code (repo này) và Kubernetes manifests (mini-ecommerce-gitops) nằm trong hai repo riêng biệt. Sự tách biệt này đảm bảo:"),
  bullet("Thay đổi code không tự động deploy — phải qua CI build -> PR review -> merge mới trigger deploy"),
  bullet("Rollback là git revert trong repo gitops — độc lập với application code"),
  bullet("Argo CD chỉ có quyền đọc gitops repo, không phải app repo"),
  spacer(),

  h2("5.4 ALB được tạo bởi Kubernetes — không phải Terraform"),
  para("Application Load Balancer được tạo bởi AWS Load Balancer Controller phản ứng với Kubernetes Ingress object. Terraform chỉ tạo IRSA role cho LBC. Điều này minh hoạ nguyên tắc GitOps: trạng thái cluster điều khiển hạ tầng, không phải ngược lại."),
  spacer(),

  h2("5.5 NAT Gateway đơn (trade-off có chủ đích)"),
  para("Dùng một NAT Gateway thay vì mỗi AZ một cái tiết kiệm ~$32/tháng. Đánh đổi (AZ 1a lỗi cũng làm AZ 1b mất egress) được chấp nhận cho scope demo ephemeral. Trade-off này được ghi rõ trong sơ đồ mạng và tài liệu này."),
  spacer(),
  spacer(),

  // ─── 6. CHÚ THÍCH MÀU SẮC ───────────────────────────────────────────
  h1("6. Chú thích màu sắc sơ đồ"),
  makeTable(
    ["Màu", "Mã hex", "Loại luồng", "Kiểu đường"],
    [
      ["Xanh dương", "#1F6FEB", "Luồng request runtime (HTTP, gRPC giữa các service)", "Liền (solid)"],
      ["Tím", "#6F42C1", "Service mesh nội bộ (gRPC, TCP Redis)", "Liền (solid)"],
      ["Hồng", "#BF2A8A", "Pipeline CI/CD (build, push, mở PR)", "Nét đứt (dashed) — bất đồng bộ"],
      ["Xanh lá", "#198038", "GitOps sync (Argo CD poll & apply)", "Chấm (dotted) — polling"],
      ["Đỏ", "#DA1E28", "Luồng bí mật (ESO đọc SM, ghi K8s Secret)", "Liền (solid)"],
      ["Cam", "#F1620E", "Quan sát hệ thống (metrics scrape, CloudWatch alarm)", "Chấm (dotted) — scrape"],
      ["Xám", "#6F6F6F", "Terraform state, hạ tầng, xác thực OIDC", "Nét đứt (dashed)"],
      ["Xanh lam nhạt", "#0F766E", "Network egress (private subnet -> NAT -> IGW)", "Nét đứt (dashed)"],
    ],
    [1400, 1200, 4000, 2760]
  ),
  spacer(),
  para("Quy ước kiểu đường:"),
  bullet("Liền (solid) = request đồng bộ (bên gọi chờ phản hồi)"),
  bullet("Nét đứt (dashed) = bất đồng bộ hoặc event-driven (trigger, push, kéo image)"),
  bullet("Chấm (dotted) = polling, scrape, hoặc luồng đã lên kế hoạch nhưng chưa kích hoạt"),
  spacer(),
];

// ════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 20, color: "222222" } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: COLOR_HEADING },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: COLOR_HEADING },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "444444" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
          children: [new TextRun({
            text: "Mini E-commerce DevOps Platform — Mo ta kien truc",
            font: "Arial", size: 16, color: "888888",
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "Trang ", font: "Arial", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" }),
            new TextRun({ text: " / ", font: "Arial", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "888888" }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/architecture-overview-vi.docx", buf);
  console.log("Done: docs/architecture-overview-vi.docx");
});
