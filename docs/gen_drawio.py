#!/usr/bin/env python3
"""
Generate docs/architecture-diagram.drawio  —  horizontal swimlane style.
Run: python docs/gen_drawio.py
Requires: nothing (pure Python stdlib)
"""
import textwrap, html, pathlib

# ── helpers ──────────────────────────────────────────────────────────────────

def _esc(s):
    return html.escape(str(s)).replace("&#x27;", "'")

_counter = [0]
def _id():
    _counter[0] += 1
    return f"c{_counter[0]}"

def _geom(x, y, w, h):
    return f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'

def aws_icon(label, icon, fill, x, y, parent, w=64, h=64):
    """AWS4 resourceIcon cell."""
    cid = _id()
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" vertex="1" parent="{parent}" '
        f'style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;strokeColor=none;'
        f'fillColor={fill};labelBackgroundColor=none;align=center;html=1;'
        f'fontSize=11;fontStyle=1;aspect=fixed;labelPosition=center;'
        f'verticalLabelPosition=bottom;verticalAlign=top;'
        f'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.{icon};">'
        f'{_geom(x,y,w,h)}</mxCell>'
    )

def user_icon(label, x, y, parent):
    cid = _id()
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" vertex="1" parent="{parent}" '
        f'style="shape=mxgraph.aws4.user;fillColor=#232F3E;strokeColor=none;'
        f'fontStyle=1;fontSize=11;labelPosition=center;verticalLabelPosition=bottom;'
        f'verticalAlign=top;align=center;fontColor=#232F3E;">'
        f'{_geom(x,y,54,68)}</mxCell>'
    )

def box(label, fill, stroke, fc, x, y, w, h, parent, rounded=1, fs=11, bold=True):
    cid = _id()
    fw = "1" if bold else "0"
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" vertex="1" parent="{parent}" '
        f'style="rounded={rounded};whiteSpace=wrap;html=1;fillColor={fill};'
        f'strokeColor={stroke};fontColor={fc};fontStyle={fw};fontSize={fs};arcSize=8;">'
        f'{_geom(x,y,w,h)}</mxCell>'
    )

def cylinder(label, fill, fc, x, y, parent, w=60, h=70):
    cid = _id()
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" vertex="1" parent="{parent}" '
        f'style="shape=cylinder3;fillColor={fill};strokeColor=#000000;'
        f'fontColor={fc};fontStyle=1;fontSize=11;'
        f'labelPosition=center;verticalLabelPosition=bottom;verticalAlign=top;align=center;">'
        f'{_geom(x,y,w,h)}</mxCell>'
    )

def swim(label, fill, stroke, fc, x, y, w, h, start=38):
    cid = _id()
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" vertex="1" parent="1" '
        f'style="swimlane;startSize={start};fillColor={fill};strokeColor={stroke};'
        f'fontStyle=1;fontSize=13;fontColor={fc};arcSize=2;rounded=1;swimlaneLine=1;">'
        f'{_geom(x,y,w,h)}</mxCell>'
    )

def edge(label, src, tgt, color, style="solid", pw=2.5, parent="1",
         exit_x=None, exit_y=None, entry_x=None, entry_y=None):
    cid = _id()
    ex_style = ""
    if exit_x  is not None: ex_style += f"exitX={exit_x};exitY={exit_y};exitDx=0;exitDy=0;"
    if entry_x is not None: ex_style += f"entryX={entry_x};entryY={entry_y};entryDx=0;entryDy=0;"
    dash = ""
    if style == "dashed": dash = "dashed=1;"
    elif style == "dotted": dash = "dashed=1;dashPattern=1 5;"
    return cid, (
        f'<mxCell id="{cid}" value="{_esc(label)}" edge="1" '
        f'source="{src}" target="{tgt}" parent="{parent}" '
        f'style="edgeStyle=orthogonalEdgeStyle;html=1;strokeColor={color};'
        f'strokeWidth={pw};fontStyle=1;fontSize=10;fontColor={color};'
        f'labelBackgroundColor=#FFFFFF;labelBorderColor=none;{dash}{ex_style}">'
        f'<mxGeometry relative="1" as="geometry"/></mxCell>'
    )

# ── colour palette ────────────────────────────────────────────────────────────
C_RUNTIME = "#1F6FEB"
C_CICD    = "#BF2A8A"
C_GITOPS  = "#198038"
C_PLATFORM= "#FF9900"
C_OBSERV  = "#E6522C"

AWS_COMPUTE  = "#ED7100"
AWS_NET      = "#8C4FFF"
AWS_DB       = "#3F48CC"
AWS_SECURITY = "#DD344C"
AWS_MGMT     = "#E7157B"
AWS_STORAGE  = "#3F8624"

K8S_FILL  = "#326CE5"   # Kubernetes blue
GH_FILL   = "#24292F"   # GitHub black
GA_FILL   = "#2088FF"   # GitHub Actions blue
ARGO_FILL = "#EF7B4D"   # Argo CD orange
PROM_FILL = "#E6522C"   # Prometheus orange-red
GRAF_FILL = "#F46800"   # Grafana orange
REDIS_RED = "#CC0000"

W = 3760  # row width (rows start at x=20, total canvas width 3800)

cells = []
def C(cid, xml): cells.append(xml); return cid

# ── TITLE ─────────────────────────────────────────────────────────────────────
title_id = _id()
cells.append(
    f'<mxCell id="{title_id}" value="Mini E-commerce DevOps Platform — Logical Architecture  (AWS ap-southeast-1)" '
    f'style="text;html=1;fontSize=20;fontStyle=1;align=center;fontColor=#232F3E;" '
    f'vertex="1" parent="1"><mxGeometry x="180" y="10" width="3440" height="40" as="geometry"/></mxCell>'
)

# ══════════════════════════════════════════════════════════════════════════════
# ROW 1 — RUNTIME REQUEST PATH
# ══════════════════════════════════════════════════════════════════════════════
r1_id, r1_xml = swim("① RUNTIME REQUEST PATH", "#EEF5FF", C_RUNTIME, C_RUNTIME,
                     20, 60, W, 310)
cells.append(r1_xml)

eu_id,  eu_xml  = user_icon("End User",             50,  100, r1_id)
alb_id, alb_xml = aws_icon("ALB\n(public, 2 AZ)",  "application_load_balancer", AWS_NET,
                             245, 95, r1_id)
ing_id, ing_xml = box("Ingress\n(AWS LBC)",         "#dae8fc","#6c8ebf","#232F3E",
                       445, 105, 130, 52, r1_id)
svc_id, svc_xml = box("Service\nfrontend:80",       "#dae8fc","#6c8ebf","#232F3E",
                       645, 105, 130, 52, r1_id)
fe_id,  fe_xml  = box("frontend\n:8080",            "#d5e8d4","#82b366","#232F3E",
                       855, 105, 130, 52, r1_id)
cat_id, cat_xml = box("productcatalog\n:3550",      "#d5e8d4","#82b366","#232F3E",
                       1090, 50, 140, 52, r1_id)
chk_id, chk_xml = box("checkout\n:5050",            "#d5e8d4","#82b366","#232F3E",
                       1090, 125, 140, 52, r1_id)
crt_id, crt_xml = box("cartservice\n:7070",         "#d5e8d4","#82b366","#232F3E",
                       1090, 200, 140, 52, r1_id)
red_id, red_xml = cylinder("Redis\n:6379\n(cart store)", REDIS_RED, "#FFFFFF",
                             1330, 190, r1_id)

for x in [eu_xml, alb_xml, ing_xml, svc_xml, fe_xml, cat_xml, chk_xml, crt_xml, red_xml]:
    cells.append(x)

# row 1 edges
C(*edge("① HTTP :80",    eu_id,  alb_id, C_RUNTIME, pw=3))
C(*edge("② HTTP :8080",  alb_id, ing_id, C_RUNTIME, pw=3))
C(*edge("③ HTTP",        ing_id, svc_id, C_RUNTIME))
C(*edge("④ HTTP :8080",  svc_id, fe_id,  C_RUNTIME))
C(*edge("⑤ gRPC :3550",  fe_id,  cat_id, C_RUNTIME, parent=r1_id))
C(*edge("⑤ gRPC :5050",  fe_id,  chk_id, C_RUNTIME, parent=r1_id))
C(*edge("⑤ gRPC :7070",  fe_id,  crt_id, C_RUNTIME, parent=r1_id))
C(*edge("TCP :6379",     crt_id, red_id, "#CC0000", style="dashed", parent=r1_id))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 2 — CI/CD & GITOPS
# ══════════════════════════════════════════════════════════════════════════════
r2_id, r2_xml = swim("② CI/CD PIPELINE  &  GITOPS", "#FFF0F5", C_CICD, C_CICD,
                     20, 390, W, 340)
cells.append(r2_xml)

dev_id, dev_xml = user_icon("Developer",                  50,  100, r2_id)
ar_id,  ar_xml  = box("App Repo\nmini-ecommerce-devops", GH_FILL, "none", "#FFFFFF",
                        230, 60, 170, 52, r2_id)
gr_id,  gr_xml  = box("GitOps Repo\nmini-ecommerce-gitops", GH_FILL, "none", "#FFFFFF",
                        230, 195, 170, 52, r2_id)
cb_id,  cb_xml  = box("ci-build-push\n(GitHub Actions)",  GA_FILL, "none", "#FFFFFF",
                        490, 35, 170, 52, r2_id)
cp_id,  cp_xml  = box("terraform-plan\n(GitHub Actions)", GA_FILL, "none", "#FFFFFF",
                        490, 105, 170, 52, r2_id)
acd_id, acd_xml = box("Argo CD\n(poll & sync)",          ARGO_FILL, "none", "#FFFFFF",
                        490, 195, 170, 52, r2_id)
ecr_r2_id, ecr_r2_xml = aws_icon("Amazon ECR\n(4 repos, cosign+SBOM)", "ecr", AWS_COMPUTE,
                                   755, 28, r2_id)
s3_id, s3_xml   = aws_icon("S3 + DynamoDB\nTF remote state", "s3", AWS_STORAGE,
                             755, 100, r2_id)
iam_id, iam_xml = aws_icon("IAM via GitHub OIDC\n(no static keys)", "role", AWS_SECURITY,
                             755, 185, r2_id)

for x in [dev_xml, ar_xml, gr_xml, cb_xml, cp_xml, acd_xml,
          ecr_r2_xml, s3_xml, iam_xml]:
    cells.append(x)

C(*edge("Ⓐ git push",                    dev_id,  ar_id,     C_CICD, pw=3))
C(*edge("Ⓑ trigger (src/**)",            ar_id,   cb_id,     C_CICD))
C(*edge("Ⓒ trigger (infra/**)",          ar_id,   cp_id,     C_CICD, style="dashed"))
C(*edge("Ⓓ open image-bump PR",          cb_id,   gr_id,     C_CICD, style="dashed"))
C(*edge("Ⓔ poll & sync",                 gr_id,   acd_id,    "#198038"))
C(*edge("Ⓕ push image",                  cb_id,   ecr_r2_id, C_CICD, pw=3))
C(*edge("read state + plan",              cp_id,   s3_id,     "#6F6F6F", style="dashed"))
C(*edge("terraform apply (local)",        dev_id,  s3_id,     "#6F6F6F", style="dashed"))
C(*edge("assume role (OIDC)",             cb_id,   iam_id,    "#DD344C", style="dotted"))
C(*edge("assume role (OIDC)",             cp_id,   iam_id,    "#DD344C", style="dotted"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 3 — EKS PLATFORM ADD-ONS
# ══════════════════════════════════════════════════════════════════════════════
r3_id, r3_xml = swim("③ EKS PLATFORM ADD-ONS  (kube-system / operators)  ·  v1.30  ·  1× m7i-flex.large",
                     "#F0FFF0", "#198038", "#198038", 20, 750, W, 195)
cells.append(r3_xml)

ac3_id, ac3_xml = box("Argo CD\n(GitOps)",               ARGO_FILL, "none", "#FFFFFF",
                        200, 65, 160, 55, r3_id)
lbc_id, lbc_xml = box("AWS Load Balancer\nController (IRSA)", AWS_NET, "none", "#FFFFFF",
                        450, 65, 180, 55, r3_id)
eso_id, eso_xml = box("External Secrets\nOperator (IRSA)",    AWS_SECURITY, "none", "#FFFFFF",
                        720, 65, 170, 55, r3_id)

for x in [ac3_xml, lbc_xml, eso_xml]:
    cells.append(x)

# ══════════════════════════════════════════════════════════════════════════════
# ROW 4 — AWS MANAGED SERVICES
# ══════════════════════════════════════════════════════════════════════════════
r4_id, r4_xml = swim("④ AWS MANAGED SERVICES", "#FFF8F0", C_PLATFORM, C_PLATFORM,
                     20, 965, W, 220)
cells.append(r4_xml)

ecr4_id, ecr4_xml = aws_icon("Amazon ECR\n(scan-on-push)",        "ecr",   AWS_COMPUTE,  80,  65, r4_id)
eks4_id, eks4_xml = aws_icon("EKS v1.30\nm7i-flex.large",        "eks",   AWS_COMPUTE,  230, 65, r4_id)
rds_id,  rds_xml  = aws_icon("RDS PostgreSQL 16\ndb.t4g.micro",  "rds",   AWS_DB,       380, 65, r4_id)
sm_id,   sm_xml   = aws_icon("Secrets Manager\nRDS credentials", "secrets_manager", AWS_SECURITY, 530, 65, r4_id)
cw_id,   cw_xml   = aws_icon("CloudWatch\nAlarms",               "cloudwatch",      AWS_MGMT,  680, 65, r4_id)
iam4_id, iam4_xml = aws_icon("IAM OIDC\nRoles",                  "role",            AWS_SECURITY, 830, 65, r4_id)
s3_4_id, s3_4_xml = aws_icon("S3 TF State\n+ DynamoDB lock",     "s3",              AWS_STORAGE,  980, 65, r4_id)

for x in [ecr4_xml, eks4_xml, rds_xml, sm_xml, cw_xml, iam4_xml, s3_4_xml]:
    cells.append(x)

# ══════════════════════════════════════════════════════════════════════════════
# ROW 5 — OBSERVABILITY
# ══════════════════════════════════════════════════════════════════════════════
r5_id, r5_xml = swim("⑤ OBSERVABILITY  (namespace: observability)",
                     "#FFF3E0", C_OBSERV, C_OBSERV, 20, 1205, W, 195)
cells.append(r5_xml)

prom_id, prom_xml = box("Prometheus\n(kube-prometheus-stack)", PROM_FILL, "none", "#FFFFFF",
                          200, 65, 180, 55, r5_id)
graf_id, graf_xml = box("Grafana\n(dashboards + alerts)",      GRAF_FILL, "none", "#FFFFFF",
                          480, 65, 180, 55, r5_id)
cwa_id,  cwa_xml  = aws_icon("CloudWatch Alarms\nRDS CPU / ALB 5xx", "cloudwatch", AWS_MGMT,
                               770, 50, r5_id)

for x in [prom_xml, graf_xml, cwa_xml]:
    cells.append(x)

C(*edge("/metrics", prom_id, graf_id, C_OBSERV, style="dashed", parent=r5_id))

# ══════════════════════════════════════════════════════════════════════════════
# CROSS-ROW EDGES
# ══════════════════════════════════════════════════════════════════════════════

# Argo CD applies manifests to boutique namespace (r2 acd → r1 fe)
C(*edge("Ⓖ apply manifests\n(boutique ns)", acd_id, fe_id, "#198038", pw=2.5, style="dotted"))

# AWS LBC provisions ALB (r3 lbc → r1 alb)
C(*edge("provisions ALB\nfrom Ingress", lbc_id, alb_id, AWS_NET, style="dashed"))

# ESO reads Secrets Manager (r3 eso → r4 sm)
C(*edge("GetSecretValue", eso_id, sm_id, "#DD344C"))

# ESO writes K8s secret to boutique (r3 eso → r1 fe)
C(*edge("write K8s Secret", eso_id, fe_id, "#DD344C", style="dashed"))

# ECR pull image → EKS (r4 ecr → r1 fe)
C(*edge("pull image", ecr4_id, fe_id, "#6F6F6F", style="dashed"))

# RDS → CloudWatch alarm (r4 rds → r5 cwa)
C(*edge("CPU / storage", rds_id, cwa_id, C_OBSERV, style="dashed"))

# ALB → CloudWatch alarm (r1 alb → r5 cwa)
C(*edge("5xx errors", alb_id, cwa_id, C_OBSERV, style="dashed"))

# Pods → Prometheus (r1 fe → r5 prom)
C(*edge("/metrics\n(pods → scrape)", fe_id, prom_id, C_OBSERV, style="dotted"))

# ══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE XML
# ══════════════════════════════════════════════════════════════════════════════
xml = textwrap.dedent(f"""\
    <mxfile host="app.diagrams.net" version="21.0.0">
      <diagram name="Logical Architecture" id="arch-main">
        <mxGraphModel dx="1800" dy="900" grid="0" gridSize="10" guides="1"
          tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1"
          pageWidth="3800" pageHeight="1420" math="0" shadow="0">
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
    {"".join(chr(10)+'        '+c for c in cells)}
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>
""")

out = pathlib.Path("docs/architecture-diagram.drawio")
out.write_text(xml, encoding="utf-8")
print(f"Written {out}  ({len(xml):,} chars, {len(cells)} cells)")
