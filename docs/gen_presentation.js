const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink, TableOfContents
} = require("docx");
const fs = require("fs");

// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  navy:    "1B3A6B",
  blue:    "2E6DB4",
  accent:  "4A90D9",
  teal:    "17A589",
  gray:    "5D6D7E",
  lightBg: "EBF5FB",
  headBg:  "1B3A6B",
  altRow:  "F2F9FF",
  white:   "FFFFFF",
  black:   "1A1A1A",
  border:  "BDC3C7",
};

// ── Common borders ─────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders    = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder   = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders  = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Helpers ────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });
const cellM = { top: 100, bottom: 100, left: 150, right: 150 };

function headCell(text, widthDXA) {
  return new TableCell({
    borders,
    width: { size: widthDXA, type: WidthType.DXA },
    shading: { fill: C.headBg, type: ShadingType.CLEAR },
    margins: cellM,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: C.white, size: 20, font: "Arial" })],
    })],
  });
}

function dataCell(text, widthDXA, shade = false, bold = false) {
  return new TableCell({
    borders,
    width: { size: widthDXA, type: WidthType.DXA },
    shading: { fill: shade ? C.altRow : C.white, type: ShadingType.CLEAR },
    margins: cellM,
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, font: "Arial", bold, color: C.black })],
    })],
  });
}

function twoColRow(col1, col2, c1w, c2w, shade = false) {
  return new TableRow({ children: [dataCell(col1, c1w, shade, true), dataCell(col2, c2w, shade)] });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, size: 20, font: "Arial", color: C.black })],
    ...sp(40, 40),
  });
}

function subBullet(label, value) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 1 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 20, font: "Arial", color: C.navy }),
      new TextRun({ text: value, size: 20, font: "Arial", color: C.black }),
    ],
    ...sp(30, 30),
  });
}

function sectionDivider(color = C.accent) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    ...sp(0, 160),
    children: [],
  });
}

function callout(text) {
  return new TableRow({
    children: [new TableCell({
      borders: noBorders,
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.lightBg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({
        children: [new TextRun({ text, size: 20, font: "Arial", italics: true, color: C.navy })],
      })],
    })],
  });
}

// ── Main document ──────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0, format: LevelFormat.BULLET, text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1, format: LevelFormat.BULLET, text: "◦",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22, color: C.black } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.blue },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.teal },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 },
      },
    ],
  },

  sections: [
    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1 — Cover Page
    // ════════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 2880, right: 1440, bottom: 2880, left: 1440 },
        },
      },
      children: [
        // Top accent bar (simulated via shaded table)
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [new TableCell({
              borders: noBorders,
              width: { size: 9360, type: WidthType.DXA },
              shading: { fill: C.navy, type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 200, right: 200 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "PORTFOLIO PROJECT", size: 22, bold: true, color: "A8D1F0", font: "Arial", characterSpacing: 200 })],
              })],
            })] }),
          ],
        }),

        new Paragraph({ children: [], ...sp(720, 0) }),

        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Mini E-commerce", size: 64, bold: true, font: "Arial", color: C.navy })],
          ...sp(0, 0),
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "DevOps Platform", size: 64, bold: true, font: "Arial", color: C.blue })],
          ...sp(0, 240),
        }),

        sectionDivider(C.accent),

        // Tagline
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: "A full-stack DevOps portfolio demonstrating Cloud Infrastructure, CI/CD, GitOps, Security & Observability on AWS",
            size: 24, italics: true, font: "Arial", color: C.gray,
          })],
          ...sp(120, 480),
        }),

        // Info table
        new Table({
          width: { size: 7200, type: WidthType.DXA },
          columnWidths: [2400, 4800],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "Author", bold: true, size: 22, font: "Arial", color: C.navy })] })] }),
              new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "VoAnhKiet1410", size: 22, font: "Arial", color: C.black })] })] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "Target Role", bold: true, size: 22, font: "Arial", color: C.navy })] })] }),
              new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "Cloud / DevOps Intern", size: 22, font: "Arial", color: C.black })] })] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "Cloud Provider", bold: true, size: 22, font: "Arial", color: C.navy })] })] }),
              new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "AWS (ap-southeast-1)", size: 22, font: "Arial", color: C.black })] })] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new TextRun({ text: "Repository", bold: true, size: 22, font: "Arial", color: C.navy })] })] }),
              new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, margins: cellM,
                children: [new Paragraph({ children: [new ExternalHyperlink({
                  link: "https://github.com/VoAnhKiet1410/mini-ecommerce-devops",
                  children: [new TextRun({ text: "github.com/VoAnhKiet1410/mini-ecommerce-devops", size: 22, font: "Arial", style: "Hyperlink" })],
                })] })] }),
            ] }),
          ],
        }),

        new Paragraph({ children: [], ...sp(480, 0) }),

        // Bottom tag row
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
          rows: [new TableRow({ children: [
            "Kubernetes", "Terraform", "GitHub Actions", "Argo CD", "Prometheus", "AWS EKS"
          ].map(tag => new TableCell({
            borders,
            width: { size: 1560, type: WidthType.DXA },
            shading: { fill: C.lightBg, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: tag, size: 18, bold: true, font: "Arial", color: C.navy })],
            })],
          }))]}),
        }),

        // Page break to content
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2 — Main Content
    // ════════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 1 } },
            spacing: { after: 0 },
            children: [
              new TextRun({ text: "Mini E-commerce DevOps Platform", bold: true, font: "Arial", size: 18, color: C.navy }),
              new TextRun({ text: "  |  VoAnhKiet1410  |  Cloud/DevOps Intern Portfolio", font: "Arial", size: 18, color: C.gray }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 1 } },
            spacing: { before: 0 },
            tabStops: [{ type: "right", position: 9360 }],
            children: [
              new TextRun({ text: "github.com/VoAnhKiet1410/mini-ecommerce-devops", font: "Arial", size: 16, color: C.gray }),
              new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: C.gray }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
            ],
          })],
        }),
      },
      children: [

        // ── TABLE OF CONTENTS ──────────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 1. PROJECT OVERVIEW
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Project Overview")] }),
        sectionDivider(),

        new Paragraph({
          children: [new TextRun({
            text: "Mini E-commerce DevOps Platform is a portfolio project built to demonstrate practical DevOps and Cloud engineering skills for a Cloud/DevOps Intern position. It wraps Google's open-source microservices-demo (Online Boutique) with a production-grade DevOps platform covering the full lifecycle: local development, cloud infrastructure, CI/CD automation, GitOps delivery, security scanning, and observability.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 200),
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Goals")] }),
        bullet("Demonstrate end-to-end DevOps competency on a real cloud platform (AWS)"),
        bullet("Show proficiency with industry-standard tools: Terraform, Kubernetes, Argo CD, GitHub Actions"),
        bullet("Implement security and observability best practices in a microservices environment"),
        bullet("Provide a recruiter-friendly live demo that can be spun up on demand and torn down to avoid cost"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Scope")] }),
        bullet("4 happy-path services deployed to AWS EKS: frontend, productcatalog, cart, checkout"),
        bullet("Full local stack via Docker Compose (8 services + PostgreSQL + Redis)"),
        bullet("Ephemeral AWS infrastructure (EKS, ECR, RDS, ALB) — apply for demo, destroy after"),
        bullet("Two-repository GitOps model: app repo + dedicated GitOps manifests repo"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Technology Stack")] }),
        new Paragraph({ children: [], ...sp(80, 80) }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headCell("Layer", 2340), headCell("Technology", 7020)] }),
            twoColRow("Languages",       "Go, C# .NET, Node.js, Python",                               2340, 7020, false),
            twoColRow("Communication",   "gRPC (Protocol Buffers) between all services",               2340, 7020, true),
            twoColRow("Containers",      "Docker, Docker Compose (multi-stage builds)",                2340, 7020, false),
            twoColRow("Orchestration",   "Kubernetes (EKS 1.30), Argo CD (GitOps)",                   2340, 7020, true),
            twoColRow("IaC",             "Terraform >= 1.5",                                           2340, 7020, false),
            twoColRow("Cloud (AWS)",     "EKS, ECR, RDS PostgreSQL 16, ALB, Secrets Manager, CloudWatch", 2340, 7020, true),
            twoColRow("CI/CD",           "GitHub Actions (OIDC), Docker Buildx",                      2340, 7020, false),
            twoColRow("Security",        "Trivy, Checkov, AWS Secrets Manager, External Secrets Operator", 2340, 7020, true),
            twoColRow("Observability",   "kube-prometheus-stack (Prometheus + Grafana), CloudWatch",   2340, 7020, false),
            twoColRow("Secret Management", "AWS Secrets Manager + ESO (EKS); .env (local)",           2340, 7020, true),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 2. SYSTEM ARCHITECTURE
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. System Architecture")] }),
        sectionDivider(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 High-Level Overview")] }),
        new Paragraph({
          children: [new TextRun({
            text: "The platform follows a two-repository GitOps model. The application repository contains source code and Terraform infrastructure. A separate GitOps repository contains Kustomize manifests that Argo CD watches and syncs to the cluster.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 160),
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [headCell("Repository", 4680), headCell("Contents", 4680)] }),
            twoColRow("mini-ecommerce-devops (this repo)", "src/, infra/, docker-compose.yml, GitHub Actions workflows, runbooks", 4680, 4680, false),
            twoColRow("mini-ecommerce-gitops",             "Kustomize base/ + overlays/aws/, Argo CD Application manifests",         4680, 4680, true),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 AWS Infrastructure")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headCell("AWS Service", 2340), headCell("Role", 7020)] }),
            twoColRow("EKS (1.30)",       "Managed Kubernetes cluster — hosts all application workloads",             2340, 7020, false),
            twoColRow("ECR",              "Private container registry — stores 4 happy-path service images",          2340, 7020, true),
            twoColRow("RDS PostgreSQL 16","Platform database in private subnets — encrypted, automated backups",     2340, 7020, false),
            twoColRow("ALB",              "Public Application Load Balancer — ingress via AWS LBC",                   2340, 7020, true),
            twoColRow("Secrets Manager", "Stores RDS credentials, synced to K8s Secrets via ESO",                   2340, 7020, false),
            twoColRow("CloudWatch",       "Alarms: RDS CPU/storage, ALB 5xx error rate",                             2340, 7020, true),
            twoColRow("IAM + OIDC",       "GitHub Actions OIDC federation — no long-lived AWS credentials",          2340, 7020, false),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Application Services")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 1170, 1170, 2340, 2340],
          rows: [
            new TableRow({ children: [
              headCell("Service", 2340), headCell("Language", 1170),
              headCell("Port", 1170),   headCell("Storage", 2340),
              headCell("Deployment", 2340),
            ] }),
            ...[
              ["frontend",             "Go",      "8080 HTTP", "—",          "EKS + Compose", false],
              ["productcatalogservice","Go",      "3550 gRPC", "In-memory",  "EKS + Compose", true],
              ["cartservice",          "C# .NET", "7070 gRPC", "Redis",      "EKS + Compose", false],
              ["checkoutservice",      "Go",      "5050 gRPC", "—",          "EKS + Compose", true],
              ["currencyservice",      "Node.js", "7000 gRPC", "JSON file",  "Compose only",  false],
              ["paymentservice",       "Node.js", "50051 gRPC","—",          "Compose only",  true],
              ["emailservice",         "Python",  "8080 gRPC", "—",          "Compose only",  false],
              ["shippingservice",      "Go",      "50051 gRPC","—",          "Compose only",  true],
            ].map(([svc, lang, port, store, deploy, shade]) =>
              new TableRow({ children: [
                dataCell(svc,    2340, shade, true),
                dataCell(lang,   1170, shade),
                dataCell(port,   1170, shade),
                dataCell(store,  2340, shade),
                dataCell(deploy, 2340, shade),
              ] })
            ),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 3. INFRASTRUCTURE AS CODE
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Infrastructure as Code (Terraform)")] }),
        sectionDivider(),

        new Paragraph({
          children: [new TextRun({
            text: "All cloud resources are defined in Terraform (>= 1.5) using a modular structure. Remote state is stored in S3 with DynamoDB locking. Terraform plan runs automatically on PRs via GitHub Actions; apply is always manual to prevent unintended cloud costs.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 160),
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Module Structure")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headCell("Module", 2340), headCell("Resources Created", 7020)] }),
            twoColRow("vpc",                    "VPC, public/private subnets, NAT gateway, route tables",         2340, 7020, false),
            twoColRow("eks",                    "EKS cluster (1.30), managed node group (m7i-flex.large), security groups", 2340, 7020, true),
            twoColRow("ecr",                    "ECR repositories for 4 services + 7-day untagged image lifecycle policy", 2340, 7020, false),
            twoColRow("rds",                    "RDS PostgreSQL 16, private subnets, KMS encryption, automated backups",   2340, 7020, true),
            twoColRow("secrets",                "AWS Secrets Manager secret with RDS credentials (JSON)",         2340, 7020, false),
            twoColRow("iam-github-oidc",        "GitHub OIDC provider, ECR push role, Terraform plan role",      2340, 7020, true),
            twoColRow("iam-irsa",               "IRSA roles for AWS Load Balancer Controller and ESO",           2340, 7020, false),
            twoColRow("observability-cloudwatch","CloudWatch alarms: RDS CPU, RDS storage, ALB 5xx rate",        2340, 7020, true),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Key Design Decisions")] }),
        bullet("No long-lived credentials — GitHub Actions uses OIDC federation to assume scoped IAM roles"),
        bullet("Least-privilege IAM — separate roles for ECR push vs Terraform plan (read-only)"),
        bullet("IRSA for in-cluster AWS access — LBC and ESO use pod-level IAM via service account annotations"),
        bullet("Ephemeral by design — full stack created in minutes, destroyed after demo to minimize cost"),
        bullet("Checkov gates on every PR — IaC security posture enforced before any merge"),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 4. CI/CD PIPELINE
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. CI/CD Pipeline (GitHub Actions)")] }),
        sectionDivider(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Workflow Overview")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 2340, 4680],
          rows: [
            new TableRow({ children: [headCell("Workflow", 2340), headCell("Trigger", 2340), headCell("Steps", 4680)] }),
            ...[
              ["ci-build-push.yml",   "Push to main (src/**)",        "OIDC auth → Docker Buildx → ECR push (sha + latest tags) → Trivy CRITICAL gate → SARIF upload", false],
              ["terraform-plan.yml",  "PR touching infra/**",         "OIDC auth → fmt check → validate → plan → Checkov → sticky PR comment with plan output",       true],
              ["security-scan.yml",   "Mondays 06:00 UTC + PR",       "Checkov (Terraform + K8s) → Trivy fs scan → upload results as artifacts",                      false],
            ].map(([wf, trigger, steps, shade]) =>
              new TableRow({ children: [
                dataCell(wf,      2340, shade, true),
                dataCell(trigger, 2340, shade),
                dataCell(steps,   4680, shade),
              ] })
            ),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Security Controls in CI")] }),
        bullet("OIDC federation — no AWS access keys stored in GitHub secrets"),
        bullet("Trivy gate — any image with CRITICAL vulnerabilities fails the build"),
        bullet("SARIF reports — HIGH/CRITICAL findings uploaded to GitHub Security tab"),
        bullet("Checkov baseline — known false positives suppressed; new issues block merge"),
        bullet("Branch protection — direct push to main requires passing status checks"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Docker Build Strategy")] }),
        bullet("Multi-stage builds — builder image discarded; only distroless/alpine runtime shipped"),
        bullet("BuildKit cache — layer caching reduces rebuild time on repeated pushes"),
        bullet("Matrix builds — 4 services built in parallel via GitHub Actions matrix strategy"),
        bullet("ECR lifecycle policy — untagged images purged after 7 days to control storage cost"),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 5. GITOPS (ARGO CD + KUSTOMIZE)
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. GitOps with Argo CD + Kustomize")] }),
        sectionDivider(),

        new Paragraph({
          children: [new TextRun({
            text: "Kubernetes deployments follow a GitOps model: no direct kubectl apply in production. All desired state lives in the mini-ecommerce-gitops repository. Argo CD continuously reconciles the cluster state against this source of truth.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 160),
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 GitOps Flow")] }),
        bullet("CI pipeline builds image and pushes to ECR with git SHA tag"),
        bullet("Automated PR bumps the image tag in the GitOps repo overlay"),
        bullet("PR review and merge triggers Argo CD sync"),
        bullet("Argo CD detects drift and reconciles the cluster to the desired state"),
        bullet("Rollback is a git revert — no special tooling required"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Kustomize Structure")] }),
        bullet("base/ — shared manifests: Deployments, Services, ConfigMaps"),
        subBullet("Namespace", "boutique"),
        subBullet("Services", "frontend, productcatalog, cart, checkout + Redis"),
        bullet("overlays/aws/ — AWS-specific patches"),
        subBullet("Image tags", "pinned ECR image references (SHA-tagged)"),
        subBullet("Ingress", "ALB Ingress resource via AWS Load Balancer Controller"),
        subBullet("Secrets", "ExternalSecret CRs that pull from Secrets Manager via ESO"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Argo CD Configuration")] }),
        bullet("Installed via Helm into argocd namespace"),
        bullet("Application CR points to mini-ecommerce-gitops repo, overlays/aws/ path"),
        bullet("Sync policy: automated self-heal + prune — cluster always converges to git state"),
        bullet("RBAC: read-only UI access for demo, admin access via CLI"),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 6. SECURITY
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Security")] }),
        sectionDivider(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Container Security (Trivy)")] }),
        bullet("Image scanning on every CI build — CRITICAL vulnerabilities fail the pipeline"),
        bullet("Filesystem scanning on schedule (Mondays) — catches dependency vulnerabilities between pushes"),
        bullet("SARIF format output — findings integrated directly into GitHub Security tab"),
        bullet("Distroless/minimal base images — smaller attack surface vs full OS images"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 IaC Security (Checkov)")] }),
        bullet("Checkov scans Terraform and Kubernetes manifests on every PR"),
        bullet("Baseline file suppresses known false positives with documented justification"),
        bullet("Frameworks: terraform, kubernetes — covers both cloud config and K8s manifests"),
        bullet("Results posted as PR comments — security findings visible before code merges"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Secrets Management")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 3510, 3510],
          rows: [
            new TableRow({ children: [headCell("Context", 2340), headCell("Secret Store", 3510), headCell("Mechanism", 3510)] }),
            twoColRow("Local development",   ".env file (gitignored)",          "Manual copy from .env.example; never committed", 2340, 3510, false),
            ...[
              ["2340", "3510", "3510"],
            ],
          ],
        }),

        // Rebuild secrets table properly
        ...[],

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 3510, 3510],
          rows: [
            new TableRow({ children: [headCell("Context", 2340), headCell("Secret Store", 3510), headCell("Mechanism", 3510)] }),
            new TableRow({ children: [dataCell("Local dev",    2340, false, true), dataCell(".env file (gitignored)", 3510, false), dataCell("Manual copy from .env.example — never committed", 3510, false)] }),
            new TableRow({ children: [dataCell("EKS workloads",2340, true,  true), dataCell("AWS Secrets Manager",   3510, true),  dataCell("External Secrets Operator syncs to K8s Secret",  3510, true)]  }),
            new TableRow({ children: [dataCell("CI/CD",        2340, false, true), dataCell("GitHub OIDC",           3510, false), dataCell("IAM role assumed per-job — zero stored creds",   3510, false)] }),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.4 Network Security")] }),
        bullet("RDS in private subnets — no public endpoint; accessible only from EKS node SG"),
        bullet("EKS nodes in private subnets — ALB terminates public traffic"),
        bullet("Security groups follow least-privilege: only required ports between tiers"),
        bullet("VPC with separate public/private subnet tiers for defense in depth"),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 7. OBSERVABILITY
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Observability")] }),
        sectionDivider(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 Metrics (Prometheus + Grafana)")] }),
        bullet("kube-prometheus-stack deployed via Helm into monitoring namespace"),
        bullet("Pre-built dashboards: cluster CPU/memory, node metrics, pod resource usage"),
        bullet("Custom Grafana dashboard (cluster-overview.json) — application-level KPIs"),
        bullet("AlertManager configured for critical pod restarts and resource pressure"),
        bullet("Grafana exposed via ALB Ingress for demo access"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 CloudWatch Alarms")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 2340, 3900],
          rows: [
            new TableRow({ children: [headCell("Alarm", 3120), headCell("Threshold", 2340), headCell("Purpose", 3900)] }),
            twoColRow("RDS CPU Utilization",   "> 80% for 5 min",  "Alert before database becomes a bottleneck",  3120, 2340, false),
            ...[],
          ],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 2340, 3900],
          rows: [
            new TableRow({ children: [headCell("Alarm", 3120), headCell("Threshold", 2340), headCell("Purpose", 3900)] }),
            new TableRow({ children: [dataCell("RDS CPU Utilization",   3120, false, true), dataCell("> 80% for 5 min",   2340, false), dataCell("Alert before database becomes a bottleneck",          3900, false)] }),
            new TableRow({ children: [dataCell("RDS Free Storage",      3120, true,  true), dataCell("< 5 GB",            2340, true),  dataCell("Early warning before disk-full event",               3900, true)]  }),
            new TableRow({ children: [dataCell("ALB 5xx Error Rate",    3120, false, true), dataCell("> 5% for 5 min",    2340, false), dataCell("Detect application errors reaching end users",        3900, false)] }),
          ],
        }),

        new Paragraph({ children: [], ...sp(160, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 Logging")] }),
        bullet("Application services use structured JSON logging (logrus) — timestamp, severity, message fields"),
        bullet("EKS pod logs accessible via kubectl and forwarded to CloudWatch Logs"),
        bullet("Docker Compose local: logs via docker compose logs -f <service>"),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 8. LOCAL DEVELOPMENT
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Local Development Environment")] }),
        sectionDivider(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1 Docker Compose Stack")] }),
        new Paragraph({
          children: [new TextRun({
            text: "The full application runs locally with a single command. Docker Compose orchestrates 10 containers: 8 microservices, PostgreSQL (platform DB), and Redis (cart storage).",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 120),
        }),
        bullet("Health checks with condition: service_healthy for Postgres and Redis dependencies"),
        bullet("Environment variables via .env file (gitignored) — template provided as .env.example"),
        bullet("All service names double as internal DNS names within the Compose network"),
        bullet("Platform DB (PostgreSQL) separate from application data — mimics cloud separation"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2 Quick Start")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headCell("Step", 3120), headCell("Command", 6240)] }),
            twoColRow("1. Configure env",    "cp .env.example .env  (then edit if needed)",                    3120, 6240, false),
            twoColRow("2. Start stack",      "docker compose up --build -d",                                   3120, 6240, true),
            twoColRow("3. Verify services",  ".\\scripts\\smoke-local.ps1",                                    3120, 6240, false),
            twoColRow("4. Verify database",  ".\\scripts\\verify-platform-db.ps1",                            3120, 6240, true),
            twoColRow("5. Open browser",     "http://localhost:8080",                                          3120, 6240, false),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 9. DEVOPS SKILLS DEMONSTRATED
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. DevOps Skills Demonstrated")] }),
        sectionDivider(),

        new Paragraph({
          children: [new TextRun({
            text: "This project was designed to showcase the full breadth of skills expected of a Cloud/DevOps engineer. The following table maps key competency areas to concrete implementations within the project.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 160),
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 3120, 3900],
          rows: [
            new TableRow({ children: [headCell("Skill Area", 2340), headCell("Tool / Technology", 3120), headCell("Evidence in Project", 3900)] }),
            ...[
              ["Cloud Infrastructure",  "AWS (EKS, ECR, RDS, ALB)",         "Multi-tier VPC, managed K8s, private RDS, ALB ingress",            false],
              ["Infrastructure as Code","Terraform >= 1.5",                  "8 reusable modules, remote state, lifecycle policies",             true],
              ["Containerization",      "Docker, multi-stage builds",        "Distroless images, BuildKit cache, ECR lifecycle",                false],
              ["Container Orchestration","Kubernetes (EKS 1.30)",            "Deployments, Services, Ingress, Namespace isolation",             true],
              ["CI/CD Automation",      "GitHub Actions + OIDC",             "3 workflows: build/push, IaC plan, security scan",               false],
              ["GitOps",                "Argo CD + Kustomize",               "2-repo model, automated sync, self-heal, overlay overlays",       true],
              ["Secret Management",     "Secrets Manager + ESO",             "Zero hardcoded secrets; OIDC for CI, IRSA for pods",             false],
              ["Security Scanning",     "Trivy + Checkov",                   "Image + filesystem + IaC scanning with CI gates",                true],
              ["Observability",         "Prometheus + Grafana + CloudWatch", "Custom dashboard, 3 CloudWatch alarms, structured logs",          false],
              ["Scripting",             "Bash + PowerShell",                 "Script pairs for every operation, idempotent design",            true],
            ].map(([skill, tool, evidence, shade]) =>
              new TableRow({ children: [
                dataCell(skill,    2340, shade, true),
                dataCell(tool,     3120, shade),
                dataCell(evidence, 3900, shade),
              ] })
            ),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════
        // 10. CONCLUSION
        // ══════════════════════════════════════════════════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. Conclusion")] }),
        sectionDivider(),

        new Paragraph({
          children: [new TextRun({
            text: "Mini E-commerce DevOps Platform demonstrates a complete, production-inspired DevOps workflow applied to a real microservices application. Every component — from the Terraform modules to the GitHub Actions workflows to the Argo CD sync policies — reflects current industry best practices for cloud-native infrastructure.",
            size: 22, font: "Arial", color: C.black,
          })],
          ...sp(0, 200),
        }),

        new Paragraph({
          children: [new TextRun({
            text: "Key highlights for recruiters:",
            size: 22, bold: true, font: "Arial", color: C.navy,
          })],
          ...sp(0, 80),
        }),
        bullet("Zero secrets in code — OIDC, IRSA, and Secrets Manager throughout"),
        bullet("Fully automated from code push to Kubernetes deployment"),
        bullet("Infrastructure disposable by design — full AWS stack in minutes, zero cost when idle"),
        bullet("Security enforced at every gate — container scan, IaC scan, branch protection"),
        bullet("Observability from day one — metrics, alarms, and structured logging built in"),
        bullet("Cross-platform scripting — every operation has both .sh and .ps1 variants"),

        new Paragraph({ children: [], ...sp(240, 0) }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [callout("This project is available for live demo. The full AWS stack can be provisioned and torn down within the same session to demonstrate end-to-end functionality without incurring ongoing cloud costs.")],
        }),

        new Paragraph({ children: [], ...sp(240, 0) }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Contact & Links")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            twoColRow("GitHub",       "github.com/VoAnhKiet1410",                                         2340, 7020, false),
            twoColRow("App Repo",     "github.com/VoAnhKiet1410/mini-ecommerce-devops",                   2340, 7020, true),
            twoColRow("GitOps Repo",  "github.com/VoAnhKiet1410/mini-ecommerce-gitops",                  2340, 7020, false),
            twoColRow("Email",        "kietanhvo4@gmail.com",                                             2340, 7020, true),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "D:\\Mini E-commerce DevOps Platform\\docs\\project-presentation.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
