/**
 * gen_script_thuyet_trinh_v2.js
 * Script thuyết trình dạng nói (tiếng Việt có dấu) — recruiter-friendly
 * Output: docs/script-thuyet-trinh-v2.docx
 *
 * Run: node docs/gen_script_thuyet_trinh_v2.js
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── Bảng màu ──────────────────────────────────────────────────────────────
const C = {
  navy:   "1B3A6B",
  blue:   "2E6DB4",
  accent: "4A90D9",
  teal:   "17A589",
  gray:   "5D6D7E",
  lightBg:"EBF5FB",
  noteBg: "FEF9E7",
  tipBg:  "E8F8F5",
  warnBg: "FDFEFE",
  headBg: "1B3A6B",
  altRow: "F2F9FF",
  white:  "FFFFFF",
  black:  "1A1A1A",
  border: "BDC3C7",
};

// ── Border helpers ────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders    = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder   = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders  = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellM      = { top: 100, bottom: 100, left: 150, right: 150 };
const cellML     = { top: 120, bottom: 120, left: 200, right: 200 };

// ── Helpers ───────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.black })],
    ...sp(60, 60),
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, size: 22, font: "Arial", color: C.black })],
    ...sp(40, 40),
  });
}

function divider(color = C.accent) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    ...sp(0, 160),
    children: [],
  });
}

function gap(pts = 120) {
  return new Paragraph({ children: [], ...sp(pts, 0) });
}

/** Box màu nhạt cho ghi chú / mục tiêu */
function calloutBox(text, fillColor, icon) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders,
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: fillColor, type: ShadingType.CLEAR },
      margins: cellML,
      children: [new Paragraph({
        children: [
          new TextRun({ text: icon + "  ", size: 22, font: "Arial" }),
          new TextRun({ text, size: 22, font: "Arial", italics: true, color: C.navy }),
        ],
      })],
    })] })],
  });
}

/** Box script nói — viền trái màu accent */
function sayBox(lines) {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: "NÓI:", bold: true, size: 18, font: "Arial", color: C.accent })],
    }),
  ];
  lines.forEach(line => {
    children.push(new Paragraph({
      children: [new TextRun({ text: line, size: 22, font: "Arial", color: C.black })],
      ...sp(40, 0),
    }));
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top: cellBorder, bottom: cellBorder, right: noBorder,
        left: { style: BorderStyle.SINGLE, size: 12, color: C.accent },
      },
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: "F4F9FF", type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 240, right: 120 },
      children,
    })] })],
  });
}

/** Step box cho hành trình code */
function stepBox(number, title, desc) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [800, 8560],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: noBorders,
        width: { size: 800, type: WidthType.DXA },
        shading: { fill: C.navy, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: number, bold: true, size: 28, font: "Arial", color: C.white })],
        })],
      }),
      new TableCell({
        borders: noBorders,
        width: { size: 8560, type: WidthType.DXA },
        shading: { fill: C.lightBg, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 120 },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 23, font: "Arial", color: C.navy })] }),
          new Paragraph({ children: [new TextRun({ text: desc,  size: 21, font: "Arial", color: C.black })] }),
        ],
      }),
    ] })],
  });
}

function headRow(cells, widths) {
  return new TableRow({ children: cells.map((text, i) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: C.headBg, type: ShadingType.CLEAR },
    margins: cellM,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: C.white, size: 20, font: "Arial" })],
    })],
  })) });
}

function dataRow(cells, widths, shade, boldIdx = []) {
  return new TableRow({ children: cells.map((text, i) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: shade ? C.altRow : C.white, type: ShadingType.CLEAR },
    margins: cellM,
    children: [new Paragraph({
      children: [new TextRun({ text, size: 21, font: "Arial", color: C.black, bold: boldIdx.includes(i) })],
    })],
  })) });
}

// ══════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ══════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: C.black } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 480, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.blue },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.teal },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    ],
  },

  sections: [

    // ════════════════════════════════════════════════════════════════════
    // TRANG BÌA
    // ════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 2520, right: 1440, bottom: 2520, left: 1440 },
        },
      },
      children: [
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: C.navy, type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: "SCRIPT THUYẼT TRÌNH — Cloud/DevOps Intern Portfolio",
                size: 20, bold: true, color: "A8D1F0", font: "Arial", characterSpacing: 120,
              })],
            })],
          })] })],
        }),

        gap(600),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Mini E-commerce", size: 72, bold: true, font: "Arial", color: C.navy })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "DevOps Platform", size: 72, bold: true, font: "Arial", color: C.blue })],
          ...sp(0, 200),
        }),

        divider(C.accent),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: "Script thuyết trình step-by-step dành cho buổi phỏng vấn / demo recruiter",
            size: 24, italics: true, font: "Arial", color: C.gray,
          })],
          ...sp(120, 480),
        }),

        new Table({
          width: { size: 7200, type: WidthType.DXA },
          columnWidths: [2400, 4800],
          rows: [
            ["Người trình bày", "VoAnhKiet1410"],
            ["Vị trí ứng tuyển", "Cloud / DevOps Intern"],
            ["GitHub", "github.com/VoAnhKiet1410"],
            ["Email", "kietanhvo4@gmail.com"],
          ].map(([label, val]) => new TableRow({ children: [
            new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, margins: cellM,
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, font: "Arial", color: C.navy })] })] }),
            new TableCell({ borders: noBorders, width: { size: 4800, type: WidthType.DXA }, margins: cellM,
              children: [new Paragraph({ children: [new TextRun({ text: val, size: 22, font: "Arial", color: C.black })] })] }),
          ] })),
        }),

        gap(400),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
          rows: [new TableRow({ children: ["Terraform", "Kubernetes", "GitHub Actions", "Argo CD", "Prometheus", "AWS EKS"].map(tag =>
            new TableCell({
              borders,
              width: { size: 1560, type: WidthType.DXA },
              shading: { fill: C.lightBg, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: tag, size: 18, bold: true, font: "Arial", color: C.navy })],
              })],
            })
          ) })],
        }),

        gap(400),

        calloutBox(
          "Thời lượng khuyến nghị: 10–15 phút trình bày + 5–10 phút Q&A. " +
          "Các mục được đánh dấu [NÓI] là script chính xác có thể " +
          "đọc thẳng — phần còn lại là ghi chú của diễn giả.",
          C.tipBg, "⏱"
        ),

        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ════════════════════════════════════════════════════════════════════
    // NỘI DUNG CHÍNH
    // ════════════════════════════════════════════════════════════════════
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
              new TextRun({ text: "Script Thuyết Trình — Mini E-commerce DevOps Platform", bold: true, font: "Arial", size: 18, color: C.navy }),
              new TextRun({ text: "  |  VoAnhKiet1410", font: "Arial", size: 18, color: C.gray }),
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
              new TextRun({ text: "kietanhvo4@gmail.com  |  github.com/VoAnhKiet1410", font: "Arial", size: 16, color: C.gray }),
              new TextRun({ text: "\tTrang ", font: "Arial", size: 16, color: C.gray }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
            ],
          })],
        }),
      },

      children: [

        // ══════════════════════════════════════════════════════════════
        // PHẦN 1 — MỞ ĐẦU
        // ══════════════════════════════════════════════════════════════
        h1("Phần 1 — Mở đầu: Đặt vấn đề  (~2 phút)"),
        divider(),

        calloutBox(
          "Mục tiêu phần này: Giúp recruiter hiểu “tại sao project này tồn tại” " +
          "trước khi bạn nói bất kỳ công nghệ nào.",
          C.tipBg, "🎯"
        ),
        gap(120),

        sayBox([
          "Cho phép tôi bắt đầu bằng một câu hỏi thực tế: Một developer vừa viết xong code, làm thế nào " +
          "để đưa code đó lên cloud một cách tự động, an toàn, có thể rollback nếu có lỗi?",
          "Đây chính là vấn đề mà team DevOps giải quyết hàng ngày. Và project này — Mini E-commerce DevOps Platform — " +
          "là câu trả lời end-to-end của tôi cho câu hỏi đó: từ lúc developer git push cho đến lúc người dùng mở website lên và thấy sản phẩm.",
        ]),

        gap(160),
        h2("1.1  Project là gì? (Elevator pitch 30 giây)"),
        body(
          "Đây KHÔNG phải là một app e-commerce được viết lại từ đầu. Tôi muốn focus vào DevOps, " +
          "không phải viết business logic. Vì vậy tôi ‘mượn’ workload có sẵn — cụ thể là Google Online Boutique, " +
          "một app microservices open-source — rồi xây toàn bộ nền tảng DevOps bao quanh nó."
        ),
        gap(80),
        calloutBox(
          "Ví dụ: Cũng như khi học Kubernetes, bạn cần một app để deploy lên — bạn dùng Spring Boot demo, " +
          "không tự viết lại Node.js từ đầu. Tương tự, tôi dùng Online Boutique làm ‘workload mẫu’.",
          C.noteBg, "💡"
        ),

        gap(160),
        h2("1.2  Những gì tôi thực sự xây"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            headRow(["Lớp", "Tôi xây gì"], [2340, 7020]),
            dataRow(["Local dev", "Docker Compose — 8 services + PostgreSQL + Redis chạy trên laptop bằng 1 lệnh"], [2340, 7020], false, [0]),
            dataRow(["IaC", "Terraform — tạo VPC, EKS, ECR, RDS, IAM trên AWS từ file code"], [2340, 7020], true, [0]),
            dataRow(["CI/CD", "GitHub Actions — tự động build image, quét bảo mật, push ECR khi push code"], [2340, 7020], false, [0]),
            dataRow(["GitOps", "Argo CD + repo riêng — cluster tự động sync theo git, không cần kubectl apply tay"], [2340, 7020], true, [0]),
            dataRow(["Security", "Trivy quét image, Checkov quét Terraform, External Secrets cho zero hardcoded secret"], [2340, 7020], false, [0]),
            dataRow(["Observability", "Prometheus + Grafana trong cluster, CloudWatch alarms cho RDS và ALB"], [2340, 7020], true, [0]),
          ],
        }),

        gap(160),
        sayBox([
          "Một điểm tôi muốn nhấn mạnh ngay từ đầu: AWS infrastructure ở đây là ephemeral — " +
          "tức là tôi có thể bật lên trong 15 phút để demo, và sau khi xong thì chạy " +
          "‘terraform destroy’ để xóa toàn bộ. Không có chi phí ongoing.",
          "Đây là một quyết định có chủ ý — nó chứng minh rằng tôi hiểu cloud cost và không lãng phí tiền trong lúc học.",
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════
        // PHẦN 2 — HÀNH TRÌNH CỦA MỘT DÒNG CODE
        // ══════════════════════════════════════════════════════════════
        h1("Phần 2 — Hành trình của một dòng code  (~4 phút)"),
        divider(),

        calloutBox(
          "Đây là phần quan trọng nhất. Thay vì liệt kê công nghệ, hãy kể một câu chuyện. " +
          "Dẫn người nghe qua từng bước, dành 30 giây mỗi bước.",
          C.tipBg, "🎯"
        ),
        gap(120),

        body(
          "Hãy tưởng tượng: tôi vừa sửa một bug trong trang hiển thị sản phẩm. " +
          "Tôi commit code và git push lên main. Điều gì xảy ra tiếp theo?"
        ),
        gap(120),

        stepBox("1", "GitHub Actions khởi động tự động",
          "Workflow ci-build-push.yml bắt chạy. Nó dùng GitHub OIDC — không có AWS key nào được lưu trong GitHub Secrets — " +
          "để lấy temporary credentials và assume IAM role chỉ có quyền push ECR."),
        gap(80),

        stepBox("2", "Docker build với BuildKit (multi-stage)",
          "Image được build theo multi-stage: stage ‘builder’ compile Go binary, stage cuối chỉ copy binary vào image distroless. " +
          "Kết quả: image nhớ, không có compiler hay tool thừa, giảm attack surface."),
        gap(80),

        stepBox("3", "Trivy quét bảo mật — Security Gate",
          "Trivy quét image vừa build. Nếu có bất kỳ CRITICAL vulnerability nào → build fail, không push. " +
          "Đây là ‘security gate’ đầu tiên — không có image xấu nào lên được ECR."),
        gap(80),

        stepBox("4", "Push lên Amazon ECR",
          "Image được tag bằng git SHA (ví dụ: sha-abc1234) và ‘latest’. " +
          "Tag SHA giúp truy vết chính xác image nào đang chạy trên cluster."),
        gap(80),

        stepBox("5", "GitOps repo cập nhật image tag",
          "Một bước tự động hoặc PR cập nhật file kustomization.yaml trong repo mini-ecommerce-gitops " +
          "để trỏ vào SHA mới."),
        gap(80),

        stepBox("6", "Argo CD phát hiện thay đổi & sync",
          "Argo CD liên tục watch repo gitops. Khi thấy SHA tag thay đổi, nó tự động apply manifest mới " +
          "vào EKS cluster — rolling update, zero downtime."),
        gap(80),

        stepBox("7", "ALB expose ra internet",
          "AWS Load Balancer Controller tạo Application Load Balancer theo Ingress manifest. " +
          "Traffic từ người dùng đi qua ALB → EKS service → pods."),
        gap(80),

        stepBox("8", "Prometheus & CloudWatch theo dõi",
          "Prometheus thu thập metrics từ pods. CloudWatch theo dõi RDS CPU, storage và ALB 5xx error rate. " +
          "Nếu có vấn đề → alarm được kích hoạt."),

        gap(160),
        calloutBox(
          "ĐIỂM NHẤN: Mỏi bước trong hành trình này là tự động và có thể audit. " +
          "Nếu có bug, tôi có thể xem git log và biết chính xác image nào, SHA nào, được deploy lúc nào.",
          C.tipBg, "✅"
        ),
        gap(120),

        sayBox([
          "Toàn bộ hành trình này — từ ‘git push’ cho đến sản phẩm mới trên website — mất khoảng 3–5 phút.",
          "Và khi có lỗi, rollback cũng chỉ cần 1 lệnh git revert — không cần tool gì đặc biệt.",
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════
        // PHẦN 3 — QUYẾT ĐỊNH KỸ THUẬT
        // ══════════════════════════════════════════════════════════════
        h1("Phần 3 — Quyết định kỹ thuật & lý do  (~3 phút)"),
        divider(),

        calloutBox(
          "Recruiter kỹ thuật / hiring manager thường hỏi ‘tại sao bạn chọn X mà không chọn Y’. " +
          "Phần này giúp bạn trả lời tự tin vì bạn có lý do, không chỉ follow tutorial.",
          C.tipBg, "🎯"
        ),

        gap(160),
        h2("3.1  Bảng đối chiếu quyết định"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            headRow(["Người ta thường làm", "Tôi làm gì khác", "Lý do"], [3120, 3120, 3120]),
            dataRow(["Lưu AWS key trong GitHub Secrets", "OIDC federation — assume IAM role tạm thời", "Key có thể bị leak; OIDC không có secret nào để lộ"], [3120, 3120, 3120], false),
            dataRow(["kubectl apply thẳng từ CI", "GitOps — Argo CD sync từ repo riêng", "Audit trail, rollback bằng git revert, single source of truth"], [3120, 3120, 3120], true),
            dataRow(["1 repo code + manifest", "2 repo tách biệt", "CI và deployment lifecycle khác nhau — dễ scale và phân quyền"], [3120, 3120, 3120], false),
            dataRow(["AWS chạy 24/7", "Ephemeral — destroy sau demo", "Tiết kiệm chi phí; chứng minh hiểu cloud cost management"], [3120, 3120, 3120], true),
            dataRow(["Lưu secret trong code / config", "Secrets Manager + ESO", "Secrets được mã hóa, rotate được, và có audit log đầy đủ"], [3120, 3120, 3120], false),
            dataRow(["terraform apply từ CI", "Apply manual local, plan trên PR", "Giảm rủi ro apply ngoài ý muốn; plan ở CI là read-only"], [3120, 3120, 3120], true),
          ],
        }),

        gap(160),
        h2("3.2  Ba quyết định quan trọng nhất"),

        h3("a) OIDC thay vì long-lived credentials"),
        body(
          "Đây là quyết định bảo mật có tác động lớn nhất. AWS khuyến nghị OIDC cho CI/CD từ 2021. " +
          "Với OIDC, mỗi GitHub Actions job được cấp một temporary token, chỉ có hiệu lực trong job đó, " +
          "và scope chỉ đủ để làm nhiệm vụ cụ thể (ví dụ: chỉ push ECR, không làm gì khác)."
        ),

        gap(80),
        h3("b) Mô hình 2-Repo GitOps"),
        body(
          "Repo thứ hai (mini-ecommerce-gitops) chỉ chứa Kustomize manifests — không có code, không có logic. " +
          "Điều này có nghĩa là: (1) bạn có thể thay đổi cách deploy mà không cần re-build image, " +
          "(2) Argo CD có thể sync với quyền hạn tối thiểu, (3) git history của gitops repo là audit log của mọi deployment."
        ),

        gap(80),
        h3("c) Ephemeral AWS + Terraform"),
        body(
          "Một số người hỏi ‘tại sao không để AWS chạy suốt?’ — vì chi phí. " +
          "EKS control plane mất $0.10/giờ, node group m7i-flex.large mất ~$0.20/giờ. " +
          "Cho một portfolio project, chạy 24/7 mất hàng triệu đồng/tháng. " +
          "Ephemeral design là đúng đắn và chứng tỏ hiểu biết về FinOps."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════
        // PHẦN 4 — DEMO HIGHLIGHTS
        // ══════════════════════════════════════════════════════════════
        h1("Phần 4 — Demo Highlights  (~3 phút)"),
        divider(),

        calloutBox(
          "Recruiter nhớ ấn tượng nhất khi thấy nó CHẠY. Nếu có thể, mở live. " +
          "Nếu AWS đã destroy, dùng screenshots / screen recording. " +
          "Thứ tự demo: local trước (nhanh, chắc), AWS sau (ấn tượng hơn).",
          C.tipBg, "🎯"
        ),

        gap(160),
        h2("4.1  Demo Local (Docker Compose) — luôn có sẵn"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3510, 5850],
          rows: [
            headRow(["Bạn làm gì", "Recruiter thấy gì"], [3510, 5850]),
            dataRow(["Chạy .\\scripts\\smoke-local.ps1", "Terminal hiển thị HTTP 200 cho mọi service — chứng tỷ tất cả pods healthy"], [3510, 5850], false),
            dataRow(["Mở http://localhost:8080", "Website e-commerce thật — browse sản phẩm, thêm vào giỏ hàng, checkout"], [3510, 5850], true),
            dataRow(["Mở /cart sau khi add sản phẩm", "Cart lưu trên Redis — reload page vẫn còn hàng trong giỏ"], [3510, 5850], false),
            dataRow(["Chạy docker compose ps", "10 containers đang chạy, tất cả healthy"], [3510, 5850], true),
          ],
        }),

        gap(160),
        h2("4.2  Demo GitHub Actions CI — không cần AWS"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3510, 5850],
          rows: [
            headRow(["Mở tab nào", "Điểm nói"], [3510, 5850]),
            dataRow(["Tab Actions trên GitHub", "3 workflows, mỗi lần push src/ là CI chạy tự động"], [3510, 5850], false),
            dataRow(["Một run thành công", "Build matrix 4 services song song, Trivy gate pass, push ECR"], [3510, 5850], true),
            dataRow(["PR có infra/** thay đổi", "terraform plan tự động comment vào PR, Checkov kết quả hiển thị luôn"], [3510, 5850], false),
            dataRow(["GitHub Security tab", "SARIF findings từ Trivy — bảo mật tích hợp vào GitHub UI"], [3510, 5850], true),
          ],
        }),

        gap(160),
        h2("4.3  Demo AWS (khi stack đang chạy)"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3510, 5850],
          rows: [
            headRow(["Demo item", "Giải thích ngắn"], [3510, 5850]),
            dataRow(["Argo CD UI", "Sync status: Healthy + Synced — cluster đang khớp với gitops repo"], [3510, 5850], false),
            dataRow(["kubectl get pods -n boutique", "4 pods Running — frontend, productcatalog, cart, checkout"], [3510, 5850], true),
            dataRow(["ALB hostname trên browser", "Website chạy trên Kubernetes, domain là AWS ALB"], [3510, 5850], false),
            dataRow(["Grafana dashboard", "CPU/memory metrics real-time từ Prometheus"], [3510, 5850], true),
            dataRow(["AWS Console — CloudWatch", "3 alarms: RDS CPU, RDS Storage, ALB 5xx — tất cả OK"], [3510, 5850], false),
            dataRow(["AWS Console — ECR", "4 repos, mỗi repo có image với SHA tag từ CI"], [3510, 5850], true),
          ],
        }),

        gap(120),
        sayBox([
          "Điều tôi thích nhất về project này là: nếu tôi push một dòng code sai lên main, " +
          "trong vòng 3 phút Trivy sẽ phát hiện vấn đề bảo mật, build sẽ fail, " +
          "và không có gì được deploy lên cluster hết.",
          "Bảo mật được enforce tự động, không phụ thuộc vào con người.",
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════
        // PHẦN 5 — Q&A CHUẨN BỊ
        // ══════════════════════════════════════════════════════════════
        h1("Phần 5 — Chuẩn bị Q&A  (tham khảo)"),
        divider(),

        calloutBox(
          "Phần này để tự ôn trước buổi phỏng vấn. Không cần đọc trong buổi thuyết trình. " +
          "Nhớ: trả lời ngắn gọn 2–3 câu đầu, sau đó mới đi sâu nếu recruiter hỏi thêm.",
          C.tipBg, "📚"
        ),

        gap(160),
        h2("5.1  Câu hỏi kỹ thuật phổ biến"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3900, 5460],
          rows: [
            headRow(["Câu hỏi", "Gợi ý trả lời"], [3900, 5460]),
            dataRow(
              ["Tại sao EKS mà không phải ECS hay App Runner?",
               "EKS cho phép chạy Kubernetes tiêu chuẩn — workload có thể migrate sang GKE/AKS mà không cần viết lại manifest. ECS là AWS-proprietary. Học K8s có giá trị lâu dài hơn."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["Production thật bạn sẽ làm khác gì?",
               "Multi-AZ RDS, blue-green deploy, Network Policies trong K8s, Argo CD không expose public, staging env riêng, secret rotation, cost alerts trên AWS Budgets."],
              [3900, 5460], true, [0]
            ),
            dataRow(
              ["Chi phí khoảng bao nhiêu?",
               "EKS control plane $0.10/giờ + node m7i-flex.large ~$0.20/giờ + ALB + RDS. Khoảng $1–2/giờ khi chạy đầy đủ. 1 buổi demo ~2 giờ = ~$3–4. Destroy sau mỗi demo."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["Argo CD sync thế nào khi image mới được push?",
               "Một bước trong CI hoặc webhook cập nhật image tag trong gitops repo. Argo CD phát hiện diff trong vòng 3 phút (mặc định poll) và sync."],
              [3900, 5460], true, [0]
            ),
            dataRow(
              ["Tại sao Kustomize mà không phải Helm?",
               "Kustomize đơn giản hơn cho use case này — không có template logic phức tạp. Helm tốt hơn khi phân phối cho nhiều người dùng với nhiều config. GitOps + Kustomize phổ biến trong production."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["Bạn xử lý secret thế nào trong CI?",
               "Không có secret nào trong CI hết. GitHub Actions dùng OIDC để assume IAM role tạm thời. Không có AWS_ACCESS_KEY_ID hay AWS_SECRET_ACCESS_KEY nào được lưu."],
              [3900, 5460], true, [0]
            ),
            dataRow(
              ["Multi-stage Docker build là gì?",
               "Build có 2 stage: stage 1 (builder) compile code, có đầy đủ compiler và tools. Stage 2 chỉ copy artifact vào base image sạch (distroless). Image cuối nhọ hơn, ít lỗ hổng bảo mật hơn."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["IRSA là gì?",
               "IAM Roles for Service Accounts — cho phép Kubernetes pod assume IAM role thông qua service account annotation. LBC và ESO dùng IRSA để gọi AWS API mà không cần hard-code credentials."],
              [3900, 5460], true, [0]
            ),
          ],
        }),

        gap(160),
        h2("5.2  Câu hỏi hành vi / soft skills"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3900, 5460],
          rows: [
            headRow(["Câu hỏi", "Gợi ý trả lời"], [3900, 5460]),
            dataRow(
              ["Khó khăn lớn nhất bạn gặp là gì?",
               "OIDC trust policy với GitHub Actions cần chính xác subject claim. Checkov false positives cần hiểu để suppress đúng cách. Argo CD sync fail do annotation sai — debug qua ‘argocd app diff’."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["Bạn học những công nghệ này ở đâu?",
               "Kết hợp: Terraform docs + HashiCorp Learn, Kubernetes docs chính thức, AWS Well-Architected, và hands-on trên project này. Tôi tin rằng học tốt nhất là làm thật."],
              [3900, 5460], true, [0]
            ),
            dataRow(
              ["Project này mất bao lâu?",
               "Khoảng [X tuần] làm theo phase: Phase 1 local Compose, Phase 2 Terraform + EKS, Phase 3 GitOps, Phase 4 Observability. Mỗi phase có runbook riêng."],
              [3900, 5460], false, [0]
            ),
            dataRow(
              ["Bạn sẽ mở rộng thêm gì?",
               "Service mesh (Istio) cho mTLS, cost optimization với Spot instances, auto-scaling theo HPA/KEDA, staging environment, và notification qua Slack khi alarm."],
              [3900, 5460], true, [0]
            ),
          ],
        }),

        gap(160),
        h2("5.3  Xử lý khi bị hỏi câu khó"),

        calloutBox(
          "Nếu bị hỏi cái gì đó mình chưa làm / chưa biết:\n" +
          "“Project này chưa cover [X] — đó là điều tôi biết cần cải thiện. " +
          "Nếu implement thêm, tôi sẽ [mô tả approach cụ thể]. " +
          "Bạn muốn tôi giải thích tại sao tôi chưa làm điều đó không?”",
          C.noteBg, "🛡"
        ),
        gap(80),
        calloutBox(
          "Nếu bị hỏi về điều gì đó trong production mà project chưa có:\n" +
          "“Đây là portfolio project, nên tôi có tính bỏ qua [X] để giữ complexity phù hợp. " +
          "Trong production thật, tôi sẽ thêm [Y] vì [lý do cụ thể].”",
          C.noteBg, "🛡"
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════
        // PHẦN 6 — KẾT LUẬN
        // ══════════════════════════════════════════════════════════════
        h1("Phần 6 — Kết luận & Đóng bài  (~1 phút)"),
        divider(),

        sayBox([
          "Tóm lại những gì tôi đã trình bày:",
          "Thứ nhất — bạn đã thấy một hệ thống e-commerce chạy hoàn chỉnh trên cloud, " +
          "được triển khai hoàn toàn bằng automation — từ code đến Kubernetes pod.",
          "Thứ hai — mọi quyết định kiến trúc đều có lý do: OIDC thay key, GitOps thay kubectl tay, " +
          "2 repo riêng, ephemeral AWS để tiết kiệm chi phí.",
          "Thứ ba — bảo mật và observability không phải after-thought — nó được build vào từ đầu: " +
          "Trivy gate trong CI, Checkov trong PR, Prometheus + CloudWatch theo dõi.",
          "Tôi sẵn sàng demo bất kỳ phần nào bạn muốn xem chi tiết hơn. " +
          "Và tôi rất muốn nghe về những challenge thực sự ở [tên công ty] để xem project này có liên quan thế nào.",
        ]),

        gap(120),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: C.navy, type: ShadingType.CLEAR },
            margins: { top: 220, bottom: 220, left: 240, right: 240 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "3 điểm bạn cần nhớ", bold: true, size: 28, font: "Arial", color: "A8D1F0" })],
              }),
              gap(60),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({
                  text: "Zero secrets trong code     |     Tự động hoàn toàn từ push đến deploy     |     Ephemeral & cost-aware",
                  size: 22, font: "Arial", color: C.white,
                })],
              }),
            ],
          })] })],
        }),

        gap(200),
        h2("Liên kết & Tài nguyên"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            headRow(["Tài nguyên", "Link"], [2340, 7020]),
            dataRow(["App Repo",    "github.com/VoAnhKiet1410/mini-ecommerce-devops"],      [2340, 7020], false),
            dataRow(["GitOps Repo", "github.com/VoAnhKiet1410/mini-ecommerce-gitops"],     [2340, 7020], true),
            dataRow(["GitHub",      "github.com/VoAnhKiet1410"],                            [2340, 7020], false),
            dataRow(["Email",       "kietanhvo4@gmail.com"],                               [2340, 7020], true),
          ],
        }),

        gap(200),
        calloutBox(
          "Sau khi demo: chạy ‘terraform destroy’ ngay lập tức để tránh phát sinh chi phí AWS. " +
          "Xem docs/runbooks/aws-down.md để có checklist đầy đủ.",
          C.warnBg, "⚠️"
        ),

      ],
    },
  ],
});

// ── Xuất file ─────────────────────────────────────────────────────────────
const OUT = "D:\\Mini E-commerce DevOps Platform\\docs\\script-thuyet-trinh-v3.docx";
Packer.toBuffer(doc)
  .then(buf => {
    fs.writeFileSync(OUT, buf);
    console.log("Da tao thanh cong: " + OUT);
  })
  .catch(err => { console.error(err); process.exit(1); });
