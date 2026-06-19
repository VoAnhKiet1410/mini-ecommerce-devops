/**
 * Generate docs/architecture-overview.docx
 * Mini E-commerce DevOps Platform — Architecture Description
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, LevelFormat,
  ExternalHyperlink,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ── Colors ──────────────────────────────────────────────────────────────
const COLOR_HEADING  = "1A3C6E";  // dark navy — main headings
const COLOR_ACCENT   = "1F6FEB";  // blue — runtime
const COLOR_CICD     = "BF2A8A";  // pink — CI/CD
const COLOR_GITOPS   = "198038";  // green — GitOps
const COLOR_SECRET   = "DA1E28";  // red — secrets
const COLOR_OBSERV   = "F1620E";  // orange — observability
const COLOR_STATE    = "6F6F6F";  // grey — terraform
const COLOR_MESH     = "6F42C1";  // purple — service mesh
const COLOR_TABLE_HD = "1A3C6E";  // table header bg
const COLOR_TABLE_AL = "EEF4FF";  // table alt row bg

// ── Helpers ──────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const hdBorder = { style: BorderStyle.SINGLE, size: 1, color: "1A3C6E" };
const hdBorders = { top: hdBorder, bottom: hdBorder, left: hdBorder, right: hdBorder };

function cell(text, opts = {}) {
  const { bold = false, color = "222222", bg = "FFFFFF", width = 4680, colspan = 1, isHeader = false } = opts;
  return new TableCell({
    columnSpan: colspan,
    borders: isHeader ? hdBorders : borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: bold || isHeader,
        color: isHeader ? "FFFFFF" : color,
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

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "222222", ...opts })],
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

function colorTag(text, color) {
  return new TextRun({ text, font: "Arial", size: 20, color, bold: true });
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

// ── Images ───────────────────────────────────────────────────────────────
function imgPara(filename, widthEMU, heightEMU, altText) {
  const imgPath = path.join(__dirname, filename);
  if (!fs.existsSync(imgPath)) return para(`[Image not found: ${filename}]`);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 160 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(imgPath),
      transformation: { width: widthEMU / 9144, height: heightEMU / 9144 },
      altText: { title: altText, description: altText, name: altText },
    })],
  });
}

// ── Table builder ────────────────────────────────────────────────────────
function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { isHeader: true, bg: COLOR_TABLE_HD, width: colWidths[i] })),
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
// CONTENT
// ════════════════════════════════════════════════════════════════════════
const children = [

  // ─── COVER / TITLE ───────────────────────────────────────────────────
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
      text: "Architecture Description & Design Decisions",
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

  // ─── 1. PROJECT OVERVIEW ─────────────────────────────────────────────
  h1("1. Project Overview"),
  para("This document describes the architecture of the Mini E-commerce DevOps Platform, a portfolio project demonstrating end-to-end DevOps practices on AWS. The platform wraps the Google Online Boutique microservices application (happy-path services only) with a production-grade DevOps foundation."),
  spacer(),
  para([
    { text: "Primary goal: ", bold: true },
    "Demonstrate Cloud/DevOps Intern capabilities — IaC, CI/CD, GitOps, observability, secrets management, and supply-chain security — using AWS as the ephemeral deployment target.",
  ]),
  spacer(),
  note("Ephemeral model: AWS resources are created before a demo and destroyed with terraform destroy afterwards. Monthly cost only applies while running (~$200/month)."),
  spacer(),

  makeTable(
    ["Dimension", "Technology"],
    [
      ["Cloud Provider", "AWS ap-southeast-1 (Singapore)"],
      ["IaC", "Terraform >= 1.5 (modules)"],
      ["Container Orchestration", "Kubernetes EKS v1.30"],
      ["CI/CD", "GitHub Actions + OIDC (no static keys)"],
      ["GitOps", "Argo CD + Kustomize (2-repo model)"],
      ["Observability", "Prometheus, Grafana, CloudWatch"],
      ["Secrets", "AWS Secrets Manager + External Secrets Operator"],
      ["Supply-chain Security", "Trivy (image scan), Checkov (IaC), cosign + SBOM"],
      ["App Languages", "Go, C# .NET, Node.js, Python (gRPC)"],
    ],
    [3600, 5760]
  ),
  spacer(),
  spacer(),

  // ─── 2. TWO-DIAGRAM APPROACH ─────────────────────────────────────────
  h1("2. Architecture Diagrams"),
  para("The architecture is documented across two complementary diagrams, each answering a different question:"),
  spacer(),

  makeTable(
    ["Diagram", "Answers", "File"],
    [
      ["Logical Architecture", "What services exist? How do requests flow? How does CI/CD, GitOps, and secrets work?", "architecture-diagram.png"],
      ["Network Topology", "Where do resources sit in the VPC? How does traffic enter and exit? Which subnets are public vs private?", "architecture-network.png"],
    ],
    [2400, 5160, 1800]
  ),
  spacer(),

  h2("2.1 Logical Architecture Diagram"),
  para("The logical diagram uses color-coded arrows to distinguish four concurrent flows. Readers should follow arrows by number within each flow."),
  spacer(),

  makeTable(
    ["Color", "Flow", "Numbering", "Description"],
    [
      ["Blue", "Runtime Request Path", "1 -> 5", "End user HTTP request through ALB, Ingress, Service, frontend pod, then gRPC calls to backend services"],
      ["Purple", "Service Mesh", "(no number)", "Internal synchronous gRPC calls between microservices and Redis TCP connection"],
      ["Pink", "CI/CD Pipeline", "A -> F", "Developer git push triggers GitHub Actions: build image, sign, push to ECR, open image-bump PR"],
      ["Green", "GitOps Sync", "(A -> F cont.)", "Argo CD polls gitops repo, syncs Kustomize overlay, applies manifests to boutique namespace"],
      ["Red", "Secrets Flow", "(no number)", "ESO reads from Secrets Manager via IRSA, writes K8s Secret into the namespace"],
      ["Orange", "Observability", "(no number)", "Prometheus scrapes /metrics, CloudWatch receives RDS and ALB alarm metrics"],
      ["Grey", "Terraform / Infra", "(no number)", "GitHub Actions plan (read-only), developer applies locally, state stored in S3 + DynamoDB"],
    ],
    [900, 2000, 1200, 5260]
  ),
  spacer(),

  imgPara("architecture-diagram.png", 600 * 9144, 750 * 9144, "Logical Architecture Diagram"),
  spacer(),

  h2("2.2 Network Topology Diagram"),
  para("The network diagram shows the physical placement of resources inside the VPC, across two Availability Zones, with public and private subnet tiers."),
  spacer(),
  imgPara("architecture-network.png", 480 * 9144, 480 * 9144, "Network Topology Diagram"),
  spacer(),
  spacer(),

  // ─── 3. COMPONENT DESCRIPTIONS ───────────────────────────────────────
  h1("3. Component Descriptions"),
  note("All values verified from infra/ Terraform code. Nothing in this section is assumed or guessed."),
  spacer(),

  // 3.1 VPC & Networking
  h2("3.1 VPC and Network Topology"),
  para("The VPC spans two Availability Zones (ap-southeast-1a and ap-southeast-1b), providing the minimum required for EKS. Resources are split across two subnet tiers:"),
  spacer(),
  makeTable(
    ["Subnet Tier", "CIDR", "AZ", "Contains"],
    [
      ["Public 1a", "10.0.101.0/24", "ap-southeast-1a", "ALB ENI, NAT Gateway (SINGLE)"],
      ["Public 1b", "10.0.102.0/24", "ap-southeast-1b", "ALB ENI (no NAT here)"],
      ["Private 1a", "10.0.1.0/24", "ap-southeast-1a", "EKS managed node (1x m7i-flex.large), RDS PostgreSQL"],
      ["Private 1b", "10.0.2.0/24", "ap-southeast-1b", "Reserved — EKS requires >=2 private subnets; no node or RDS today"],
    ],
    [1600, 1800, 2000, 3960]
  ),
  spacer(),

  h3("NAT Gateway — Single Instance Design"),
  para("A single NAT Gateway is deployed in public subnet 1a. Both private subnets route outbound traffic (0.0.0.0/0) through this single NAT via their route tables."),
  spacer(),
  makeTable(
    ["Aspect", "Detail"],
    [
      ["Design choice", "single_nat_gateway = true in Terraform VPC module"],
      ["Cost", "~$32/month (1 NAT) vs ~$64/month (2 NAT, one per AZ)"],
      ["Trade-off", "If AZ 1a fails, AZ 1b private subnet also loses egress (NAT is in AZ 1a)"],
      ["Justification", "Acceptable for demo/ephemeral deployment. Production would use one NAT per AZ."],
      ["Use cases for egress", "EKS nodes pulling images from ECR, reaching AWS API endpoints, package downloads"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.2 EKS
  h2("3.2 Amazon EKS Cluster"),
  para("The Kubernetes cluster is the central compute platform. Application workloads, GitOps agents, and observability tools all run here."),
  spacer(),
  makeTable(
    ["Property", "Value"],
    [
      ["Cluster name", "mini-ecommerce-devops"],
      ["Kubernetes version", "1.30"],
      ["API endpoint access", "Public + Private (both enabled)"],
      ["Public CIDR", "0.0.0.0/0 (unrestricted — restrict to your IP in production)"],
      ["Node group type", "Managed node group"],
      ["Instance type", "m7i-flex.large (Intel Flex — burstable, 2 vCPU / 8 GB RAM)"],
      ["Capacity type", "ON_DEMAND (not Spot — avoids eviction during demo)"],
      ["Node count", "desired = 1, min = 1, max = 1 (fixed, no autoscaling)"],
      ["Node cost", "~$71/month (ON_DEMAND, ap-southeast-1)"],
      ["OIDC provider", "Auto-created — enables IRSA for LBC and ESO"],
      ["Control plane logging", "Not configured (CloudWatch cost not justified for demo)"],
    ],
    [3000, 6360]
  ),
  spacer(),

  h3("Namespaces"),
  makeTable(
    ["Namespace", "Purpose", "Key Workloads"],
    [
      ["kube-system", "Platform operators", "AWS Load Balancer Controller, CoreDNS, kube-proxy, vpc-cni"],
      ["external-secrets", "Secrets management operator", "External Secrets Operator"],
      ["argocd", "GitOps controller", "Argo CD server, repo-server, application-controller"],
      ["boutique", "Application workloads", "frontend, productcatalog, cartservice, checkout, Redis"],
      ["monitoring", "Observability stack", "Prometheus, Grafana (kube-prometheus-stack Helm chart)"],
    ],
    [2200, 2800, 4360]
  ),
  spacer(),

  // 3.3 Application Services
  h2("3.3 Application Services (namespace: boutique)"),
  para("Only happy-path services are deployed to EKS. The full service mesh (currency, shipping, payment, email) runs locally in Docker Compose for development purposes only."),
  spacer(),
  makeTable(
    ["Service", "Language", "Port", "Protocol", "Storage", "EKS Deployed"],
    [
      ["frontend", "Go", "8080", "HTTP (inbound), gRPC (outbound)", "None — orchestrates backends", "Yes"],
      ["productcatalogservice", "Go", "3550", "gRPC", "In-memory products.json", "Yes"],
      ["cartservice", "C# .NET", "7070", "gRPC", "Redis :6379 (in-cluster)", "Yes"],
      ["checkoutservice", "Go", "5050", "gRPC", "None — orchestrator", "Yes"],
      ["Redis", "Redis", "6379", "TCP", "In-memory (ephemeral)", "Yes (in-cluster Deployment)"],
      ["currencyservice", "Node.js", "7000", "gRPC", "currency_conversion.json", "No — Compose only"],
      ["paymentservice", "Node.js", "50051", "gRPC", "None (mock)", "No — Compose only"],
      ["emailservice", "Python", "8080", "gRPC", "None (mock)", "No — Compose only"],
      ["shippingservice", "Go", "50051", "gRPC", "None (mock)", "No — Compose only"],
    ],
    [2100, 1200, 900, 2200, 2200, 1760]
  ),
  spacer(),
  note("Redis is an in-cluster Kubernetes Deployment — NOT AWS ElastiCache. This is intentional: the cart data is ephemeral and does not require managed Redis for this demo scope."),
  spacer(),

  h3("frontend Service-to-Service Calls"),
  para("The frontend makes outbound gRPC calls to multiple backend services on every page load. In EKS, only the happy-path services respond. In Docker Compose, all services are available."),
  spacer(),
  makeTable(
    ["frontend calls ->", "Port", "Call purpose", "Available in EKS?"],
    [
      ["productcatalogservice", "3550", "List products, get product details", "Yes"],
      ["cartservice", "7070", "Add/view/clear cart", "Yes"],
      ["checkoutservice", "5050", "Place order", "Yes"],
      ["currencyservice", "7000", "Convert prices to user currency", "No (Compose only)"],
      ["shippingservice", "50051", "Get shipping quote", "No (Compose only)"],
      ["recommendationservice", "8080", "Product recommendations", "No (not deployed anywhere)"],
      ["adservice", "9555", "Display advertisements", "No (not deployed anywhere)"],
    ],
    [2600, 900, 2900, 1960]
  ),
  spacer(),

  h3("checkoutservice Service-to-Service Calls"),
  para("Checkout orchestrates the full order flow. In EKS, calls to non-deployed services would cause gRPC dial errors — these services only run in Docker Compose."),
  spacer(),
  makeTable(
    ["checkoutservice calls ->", "Port", "Call purpose", "Available in EKS?"],
    [
      ["cartservice", "7070", "GetCart, EmptyCart", "Yes"],
      ["productcatalogservice", "3550", "GetProduct (for each item)", "Yes"],
      ["currencyservice", "7000", "Convert prices", "No (Compose only)"],
      ["shippingservice", "50051", "GetQuote, ShipOrder", "No (Compose only)"],
      ["paymentservice", "50051", "Charge credit card (mock)", "No (Compose only)"],
      ["emailservice", "8080", "SendOrderConfirmation (mock)", "No (Compose only)"],
    ],
    [2600, 900, 2900, 1960]
  ),
  spacer(),

  // 3.4 ALB + Ingress
  h2("3.4 Application Load Balancer (ALB)"),
  para([
    "The ALB is ",
    { text: "NOT created by Terraform", bold: true },
    ". It is provisioned dynamically by the AWS Load Balancer Controller (LBC), which watches Kubernetes Ingress objects and creates/updates the corresponding ALB in AWS.",
  ]),
  spacer(),
  makeTable(
    ["Aspect", "Detail"],
    [
      ["Who creates it", "AWS Load Balancer Controller reacting to Ingress object in boutique namespace"],
      ["When it is created", "After Argo CD applies the Ingress manifest to the cluster (Phase 3 onwards)"],
      ["ALB type", "Internet-facing (public)"],
      ["Subnets", "Both public subnets (10.0.101.0/24, 10.0.102.0/24) — tagged kubernetes.io/role/elb=1"],
      ["Target", "EKS node on port 8080 (frontend pod)"],
      ["Terraform involvement", "None — only the LBC IAM role (IRSA) is created by Terraform"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.5 RDS
  h2("3.5 RDS PostgreSQL"),
  para([
    "RDS is provisioned as a ",
    { text: "platform DB shell", bold: true },
    " — it exists to demonstrate the full IaC capability but is ",
    { text: "not used by any application service", bold: true },
    ". App services use Redis (cart) and in-memory storage, following the upstream Online Boutique architecture.",
  ]),
  spacer(),
  makeTable(
    ["Property", "Value"],
    [
      ["Engine", "PostgreSQL 16"],
      ["Instance class", "db.t4g.micro (Graviton2, 1 vCPU, 1 GB RAM)"],
      ["Cost", "~$13/month (single-AZ, ap-southeast-1)"],
      ["Storage", "20 GB gp3 (encrypted at rest)"],
      ["Multi-AZ", "No — single-AZ (AZ 1a only)"],
      ["HA trade-off", "AZ 1a failure = DB unavailable. Acceptable: demo ephemeral, app does not use RDS."],
      ["Public accessibility", "No — private subnets only"],
      ["Backup retention", "1 day (minimal — no final snapshot on destroy)"],
      ["Deletion protection", "Off (allows terraform destroy without manual intervention)"],
      ["Credentials", "Random 24-char password stored in Secrets Manager, synced to cluster via ESO"],
    ],
    [3000, 6360]
  ),
  spacer(),

  // 3.6 Secrets flow
  h2("3.6 Secrets Management Flow"),
  para("The secrets flow ensures no credentials are hardcoded anywhere — not in code, not in Kubernetes manifests, not in GitHub Actions."),
  spacer(),
  makeTable(
    ["Step", "Component", "Action"],
    [
      ["1", "Terraform (local apply)", "Creates RDS, generates random password, stores in Secrets Manager as JSON: {username, password, host, port, dbname}"],
      ["2", "External Secrets Operator", "Runs in EKS with IRSA role (secretsmanager:GetSecretValue). Watches ExternalSecret CR in boutique namespace."],
      ["3", "ExternalSecret CR", "Argo CD applies this manifest. It references the Secrets Manager secret path and maps keys to K8s Secret fields."],
      ["4", "K8s Secret", "ESO creates/syncs the K8s Secret in boutique namespace. Pods mount it as environment variables or volume."],
      ["5", "GitHub Actions", "Uses GitHub OIDC to assume IAM role (no AWS_ACCESS_KEY_ID stored in GitHub). Trust restricted to main branch (ECR push) or PR (TF plan)."],
    ],
    [600, 2400, 6360]
  ),
  spacer(),

  // 3.7 CI/CD
  h2("3.7 CI/CD Pipeline (GitHub Actions)"),
  para("Three workflows are defined. Only terraform-plan runs in CI — terraform apply is always manual local to prevent accidental infrastructure changes."),
  spacer(),
  makeTable(
    ["Workflow", "Trigger", "Steps", "IAM Role Used"],
    [
      ["ci-build-push", "push to main touching src/**", "1. Checkout  2. OIDC assume ECR-push role  3. Docker Buildx multi-arch  4. Trivy CRITICAL gate (fail if found)  5. cosign sign + SBOM  6. Push to ECR (sha + latest tags)  7. Open image-bump PR to gitops repo", "github-actions-ecr (main branch only)"],
      ["terraform-plan", "PR touching infra/**", "1. OIDC assume TF-plan role (read-only)  2. terraform fmt -check  3. terraform validate  4. terraform plan  5. Checkov scan (baseline)  6. Post sticky PR comment with plan output", "github-actions-terraform-plan (PR only, read-only)"],
      ["security-scan", "Schedule Mon 06:00 UTC + PR", "1. Checkov on terraform/ and k8s manifests  2. Trivy fs scan (HIGH + CRITICAL)  3. Upload SARIF to GitHub Security", "None (read-only repo access)"],
    ],
    [1800, 1600, 4000, 1960]
  ),
  spacer(),
  note("terraform apply is deliberately NOT automated from CI. The developer runs it locally: cd infra/environments/aws && terraform apply tfplan. This prevents accidental infrastructure changes from CI."),
  spacer(),

  // 3.8 GitOps
  h2("3.8 GitOps (Argo CD + Kustomize)"),
  para("A two-repository model separates application source code from deployment manifests. CI builds and signs images; GitOps manages what is deployed to the cluster."),
  spacer(),
  makeTable(
    ["Repository", "Contains", "Who writes to it"],
    [
      ["mini-ecommerce-devops (this repo)", "src/ application code, infra/ Terraform, CI workflows, runbooks", "Developers (git push), CI (terraform-plan comment)"],
      ["mini-ecommerce-gitops (separate repo)", "Kustomize base/ manifests + overlays/aws/ with ECR image tags", "CI opens image-bump PR after each successful build; developer merges"],
    ],
    [2800, 3600, 2960]
  ),
  spacer(),
  makeTable(
    ["GitOps Aspect", "Detail"],
    [
      ["Sync method", "Argo CD polls mini-ecommerce-gitops every 3 minutes (pull model — NOT webhook)"],
      ["Manifest format", "Kustomize overlay aws/ on top of base/"],
      ["Image update flow", "CI pushes to ECR -> opens PR to gitops repo with new image tag -> developer merges -> Argo CD picks up on next poll"],
      ["Deploy trigger", "Argo CD detects diff between cluster state and git state, applies missing/changed resources"],
      ["Namespace deployed to", "boutique (app pods, Ingress, Services, ExternalSecret)"],
      ["What Argo CD does NOT deploy", "Operators (LBC, ESO, Prometheus) — these are installed via Helm scripts before Argo CD is configured"],
    ],
    [2800, 6560]
  ),
  spacer(),

  // 3.9 Observability
  h2("3.9 Observability"),
  para("The observability stack combines in-cluster metrics (Prometheus + Grafana) with AWS-native alarms (CloudWatch). Distributed tracing is code-wired but not yet active."),
  spacer(),
  makeTable(
    ["Component", "Type", "What it monitors", "Status"],
    [
      ["Prometheus", "In-cluster (kube-prometheus-stack)", "Pod CPU/memory, K8s events, custom /metrics endpoints from app pods", "Deployed"],
      ["Grafana", "In-cluster (kube-prometheus-stack)", "Dashboards: cluster-overview.json (custom), default K8s dashboards", "Deployed"],
      ["CloudWatch Alarm: RDS CPU", "AWS managed", "RDS CPUUtilization > 80% for 2 periods of 5 minutes", "Active (no SNS action — demo)"],
      ["CloudWatch Alarm: RDS Storage", "AWS managed", "RDS FreeStorageSpace < 2 GB for 2 periods of 5 minutes", "Active (no SNS action — demo)"],
      ["CloudWatch Alarm: ALB 5xx", "AWS managed", "ALB HTTPCode_Target_5XX_Count > 10 per 5-minute period", "Active once ALB is provisioned"],
      ["OTel Collector", "Planned — not deployed", "Distributed traces from frontend (OTLP). Code wired in src/frontend/main.go", "Inactive: ENABLE_TRACING=0"],
    ],
    [2400, 2000, 3200, 1760]
  ),
  spacer(),

  // 3.10 ECR
  h2("3.10 Amazon ECR"),
  makeTable(
    ["Repository", "Scan on Push", "Lifecycle Policy", "Image Signing"],
    [
      ["mini-ecommerce/frontend", "Yes (HIGH+CRITICAL reported)", "Untagged images deleted after 7 days", "cosign + SBOM (CI step 5)"],
      ["mini-ecommerce/productcatalogservice", "Yes", "Untagged images deleted after 7 days", "cosign + SBOM"],
      ["mini-ecommerce/cartservice", "Yes", "Untagged images deleted after 7 days", "cosign + SBOM"],
      ["mini-ecommerce/checkoutservice", "Yes", "Untagged images deleted after 7 days", "cosign + SBOM"],
    ],
    [3200, 1800, 2400, 1960]
  ),
  spacer(),
  spacer(),

  // ─── 4. COST ANALYSIS ────────────────────────────────────────────────
  h1("4. Cost Analysis (When Running)"),
  note("Ephemeral model: terraform destroy after each demo brings cost to $0. Costs below apply only while the stack is running."),
  spacer(),
  makeTable(
    ["Resource", "Spec", "Cost / Month", "Optimization Applied"],
    [
      ["EKS Control Plane", "Managed (AWS-managed masters)", "~$73", "Fixed — no way to reduce"],
      ["EKS Node", "1x m7i-flex.large ON_DEMAND", "~$71", "ON_DEMAND for demo reliability (Spot would save ~65% = ~$25/mo)"],
      ["NAT Gateway", "1 gateway + data transfer", "~$32", "Single NAT (not per-AZ) saves ~$32/mo"],
      ["RDS PostgreSQL", "db.t4g.micro single-AZ 20GB gp3", "~$13", "Graviton2 cheapest tier; single-AZ saves ~$13/mo"],
      ["ECR", "4 repos, storage + transfer", "~$3", "Lifecycle policy removes untagged after 7 days"],
      ["S3 + DynamoDB (state)", "Versioned bucket + lock table", "~$1", "DynamoDB PAY_PER_REQUEST"],
      ["CloudWatch Alarms", "3 alarms, no log groups", "~$1", "No control plane logs (saves ~$5-10/mo)"],
      ["Data transfer", "ECR pulls, ALB, misc", "~$5-15", "S3 Gateway endpoint would eliminate ECR pull cost"],
      ["TOTAL (estimated)", "", "~$200-210/month", "Destroy when not in use -> $0"],
    ],
    [2400, 2600, 1560, 2800]
  ),
  spacer(),

  h2("4.1 Cost Optimization Already Applied"),
  bullet("Single NAT Gateway (single_nat_gateway = true) — saves ~$32/month vs one-per-AZ"),
  bullet("RDS db.t4g.micro Graviton2 — cheapest RDS tier (~$13/month)"),
  bullet("RDS Single-AZ — saves ~$13/month vs Multi-AZ"),
  bullet("Fixed node count (1) — no idle node capacity"),
  bullet("gp3 storage — 20% cheaper than gp2 at same performance"),
  bullet("ECR lifecycle policy — prevents storage bloat from old images"),
  bullet("DynamoDB PAY_PER_REQUEST for state lock — no provisioned capacity cost"),
  bullet("No CloudWatch control plane logs — saves $5-10/month"),
  spacer(),

  h2("4.2 Further Optimizations (Not Applied — Trade-offs Noted)"),
  makeTable(
    ["Optimization", "Saving", "Trade-off / Why Not Applied"],
    [
      ["Switch EKS node to Spot instances", "~$46/month (65% savings)", "Spot can be interrupted. Demo requires stable 1-node cluster."],
      ["Add S3 Gateway VPC Endpoint (free)", "Eliminates ECR pull NAT data costs", "Minor saving — not implemented yet. Free to add."],
      ["Reduce RDS backup retention to 0", "~$2/month", "0-day retention disables PITR entirely. Already at minimum (1 day)."],
      ["Remove RDS entirely", "~$13/month", "RDS is the platform DB shell — demonstrates IaC capability. Removing it undermines the portfolio scope."],
    ],
    [2800, 1800, 4760]
  ),
  spacer(),
  spacer(),

  // ─── 5. DESIGN DECISIONS ─────────────────────────────────────────────
  h1("5. Key Design Decisions"),

  h2("5.1 No Static AWS Credentials"),
  para("GitHub Actions uses GitHub OIDC to assume IAM roles at runtime. No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is stored in GitHub Secrets."),
  bullet("ECR-push role: trusted only for refs/heads/main (main branch commits)"),
  bullet("TF-plan role: trusted only for pull_request events (read-only permissions)"),
  bullet("EKS operators (LBC, ESO) use IRSA — IAM roles bound to K8s service accounts via OIDC"),
  spacer(),

  h2("5.2 terraform apply is Manual — Never Automated"),
  para("The CI workflow runs terraform plan on PRs (read-only). Terraform apply is always run manually from the developer's local machine. This prevents accidental infrastructure changes triggered by code pushes."),
  spacer(),

  h2("5.3 Two-Repository GitOps Model"),
  para("Source code (this repo) and Kubernetes manifests (mini-ecommerce-gitops) are in separate repositories. This separation means:"),
  bullet("A code change does not automatically deploy — it goes through CI build -> PR review -> merge to trigger deployment"),
  bullet("Rollback is a git revert in the gitops repo — independent of application code"),
  bullet("Argo CD only has read access to the gitops repo, not the application repo"),
  spacer(),

  h2("5.4 ALB Provisioned by Kubernetes — Not Terraform"),
  para("The Application Load Balancer is created by the AWS Load Balancer Controller responding to a Kubernetes Ingress object. Terraform only creates the IRSA role for LBC. This demonstrates the GitOps principle: cluster state drives infrastructure, not the other way around."),
  spacer(),

  h2("5.5 Single NAT Gateway (Deliberate Trade-off)"),
  para("Using one NAT Gateway instead of one-per-AZ saves ~$32/month. The trade-off (AZ 1a failure also breaks AZ 1b egress) is acceptable for this demo scope. Documentation in the network diagram makes this trade-off explicit."),
  spacer(),
  spacer(),

  // ─── 6. EDGE COLORS LEGEND ───────────────────────────────────────────
  h1("6. Diagram Edge Color Legend"),
  makeTable(
    ["Color", "Hex", "Flow Type", "Line Style"],
    [
      ["Blue", "#1F6FEB", "Runtime request path (HTTP, gRPC between services)", "Solid"],
      ["Purple", "#6F42C1", "Internal service mesh (gRPC, Redis TCP)", "Solid"],
      ["Pink", "#BF2A8A", "CI/CD pipeline (build, push, PR)", "Dashed (async)"],
      ["Green", "#198038", "GitOps sync (Argo CD poll & apply)", "Dotted (poll/planned)"],
      ["Red", "#DA1E28", "Secrets flow (ESO reads SM, writes K8s Secret)", "Solid"],
      ["Orange", "#F1620E", "Observability (metrics scrape, CloudWatch alarms)", "Dotted (scrape)"],
      ["Grey", "#6F6F6F", "Terraform state, infra ops, OIDC auth", "Dashed (async)"],
      ["Teal", "#0F766E", "Network egress (private subnet -> NAT -> IGW)", "Dashed (async)"],
    ],
    [900, 1100, 4560, 1800]
  ),
  spacer(),
  para("Edge style convention:"),
  bullet("Solid line = synchronous request (caller waits for response)"),
  bullet("Dashed line = asynchronous or event-driven (trigger, push, image pull)"),
  bullet("Dotted line = polling, scraping, or planned-not-yet-active flow"),
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
            text: "Mini E-commerce DevOps Platform — Architecture Description",
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
            new TextRun({ text: "Page ", font: "Arial", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" }),
            new TextRun({ text: " of ", font: "Arial", size: 16, color: "888888" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "888888" }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/architecture-overview.docx", buf);
  console.log("Done: docs/architecture-overview.docx");
});
