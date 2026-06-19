"""
Architecture diagrams for Mini E-commerce DevOps Platform.
Run: python docs/draw_architecture.py

Outputs (3 files):
  docs/architecture-diagram.png   -> Logical architecture: runtime + CI/CD + GitOps + observability
  docs/architecture-network.png   -> Network topology: VPC / AZ / subnets / NAT / IGW
  docs/architecture-legend.png    -> Edge color + line-style key

All values verified against infra/ Terraform (2026-06):
  VPC          10.0.0.0/16, 2 AZ (ap-southeast-1a/1b), single NAT gateway (cost-optimized)
  EKS          v1.30, managed node group 1x m7i-flex.large, ON_DEMAND, desired/min/max = 1
  RDS          PostgreSQL 16, db.t4g.micro (Graviton), single-AZ, 20 GB gp3, private
  ECR          4 repos (frontend, productcatalog, cart, checkout), scan-on-push, 7d untagged TTL
  Add-ons      AWS LBC (creates ALB), External Secrets Operator (reads Secrets Manager), Argo CD

Label rules
  Runtime / mesh edges -> protocol only      (e.g. "HTTP :80", "gRPC :3550", "TCP :6379")
  CI/CD / GitOps edges -> action only        (e.g. "push image", "apply manifests")
  Observability edges  -> data emitted        (e.g. "/metrics", "CPU / storage")
  Network edges        -> route / direction   (e.g. "egress 0.0.0.0/0", "target group")
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import ECR, EKS, EC2
from diagrams.aws.network import (
    ALB, NATGateway, InternetGateway, PublicSubnet, PrivateSubnet, VPC,
)
from diagrams.aws.database import RDS
from diagrams.aws.storage import S3
from diagrams.aws.security import SecretsManager, IAMRole
from diagrams.aws.management import Cloudwatch
from diagrams.onprem.ci import GithubActions
from diagrams.onprem.vcs import Github
from diagrams.onprem.gitops import Argocd
from diagrams.onprem.monitoring import Prometheus, Grafana
from diagrams.onprem.inmemory import Redis
from diagrams.onprem.client import User
from diagrams.onprem.network import Internet
from diagrams.k8s.compute import Pod
from diagrams.k8s.network import Ing, Service
from diagrams.k8s.ecosystem import Helm
from diagrams.generic.blank import Blank

C_RUNTIME = "#1F6FEB"   # blue   — runtime request path
C_MESH    = "#6F42C1"   # purple — internal gRPC service mesh
C_CICD    = "#BF2A8A"   # pink   — CI/CD pipeline
C_GITOPS  = "#198038"   # green  — GitOps sync
C_SECRET  = "#DA1E28"   # red    — secrets flow
C_OBSERV  = "#F1620E"   # orange — observability
C_STATE   = "#6F6F6F"   # grey   — terraform state / infra / egress
C_EGRESS  = "#0F766E"   # teal   — network egress


def step(num, text):
    """Runtime flow numbering: 1 2 3 ..."""
    circled = "①②③④⑤⑥⑦⑧⑨"[num - 1]
    return f"  {circled}  {text}  "


def step_ci(num, text):
    """CI/CD flow numbering: A B C ... (distinct from runtime)"""
    circled = "ⒶⒷⒸⒹⒺⒻⒼⒽⒾ"[num - 1]
    return f"  {circled}  {text}  "


graph_attr = {
    "fontsize": "24", "fontname": "Helvetica-Bold", "bgcolor": "#FFFFFF",
    "dpi": "180", "pad": "1.5", "splines": "ortho",
    "nodesep": "1.8", "ranksep": "2.6",
    "compound": "true", "newrank": "true", "concentrate": "false",
}
node_attr = {"fontsize": "18", "fontname": "Helvetica-Bold", "margin": "0.45"}
edge_attr = {"fontsize": "15", "fontname": "Helvetica-Bold",
             "penwidth": "2.4", "arrowsize": "1.0"}


# ════════════════════════════════════════════════════════════════════════
# DIAGRAM 1 — LOGICAL ARCHITECTURE  (runtime + CI/CD + GitOps + observ.)
# ════════════════════════════════════════════════════════════════════════
with Diagram(
    "Mini E-commerce DevOps Platform — Logical Architecture (AWS ap-southeast-1)",
    filename="docs/architecture-diagram", outformat="png",
    graph_attr=graph_attr, node_attr=node_attr, edge_attr=edge_attr,
    direction="LR", show=False,
):
    # ── ACTORS ───────────────────────────────────────────────
    end_user = User("End user\n(browser)")
    dev      = User("Developer")

    # ── GITHUB ───────────────────────────────────────────────
    with Cluster("GitHub",
                 graph_attr={"bgcolor": "#F6F8FA", "fontsize": "20",
                             "fontname": "Helvetica-Bold", "style": "rounded",
                             "color": "#24292F", "penwidth": "2.0"}):
        app_repo    = Github("mini-ecommerce-devops")
        gitops_repo = Github("mini-ecommerce-gitops")
        with Cluster("GitHub Actions",
                     graph_attr={"bgcolor": "#FFFFFF", "style": "dashed",
                                 "fontsize": "17", "color": "#555555"}):
            ci_build = GithubActions("ci-build-push")
            ci_plan  = GithubActions("terraform-plan")

    tf_state = S3("S3 + DynamoDB\nTerraform state\n(remote backend + lock)")

    # ── AWS CLOUD ────────────────────────────────────────────
    with Cluster("AWS Cloud  •  ap-southeast-1",
                 graph_attr={"bgcolor": "#FFF8F0", "fontsize": "22",
                             "fontname": "Helvetica-Bold", "style": "rounded",
                             "color": "#FF9900", "penwidth": "2.5", "labeljust": "l"}):

        ecr = ECR("Amazon ECR\nmini-ecommerce/*\n(4 repos • scan-on-push)")

        # OIDC roles assumed by GitHub Actions (no static keys)
        oidc_role = IAMRole("IAM via GitHub OIDC\nECR-push (main)\nTF-plan (PR, read-only)")

        with Cluster("VPC  10.0.0.0/16   •   2 AZ   •   single NAT (see network diagram)",
                     graph_attr={"bgcolor": "#EEF4FF", "fontsize": "19",
                                 "fontname": "Helvetica-Bold",
                                 "color": "#1F6FEB", "penwidth": "2.0", "labeljust": "l"}):

            alb = ALB("Application\nLoad Balancer\n(public, 2 AZ)")

            with Cluster("AWS Managed Services  (private subnets / regional)",
                         graph_attr={"bgcolor": "#F5F0FF", "fontsize": "16",
                                     "style": "dashed", "color": "#8B5CF6",
                                     "penwidth": "1.5"}):
                sm  = SecretsManager("Secrets Manager\n(RDS credentials)")
                cw  = Cloudwatch("CloudWatch\nalarms")
                rds = RDS("RDS PostgreSQL 16\ndb.t4g.micro • single-AZ\nplatform DB (not used by app)")

            with Cluster("EKS  mini-ecommerce-devops  •  v1.30   •   node group: 1× m7i-flex.large (ON_DEMAND)",
                         graph_attr={"bgcolor": "#E8F5E9", "fontsize": "18",
                                     "fontname": "Helvetica-Bold",
                                     "color": "#34A853", "penwidth": "2.0", "labeljust": "l"}):

                with Cluster("Platform add-ons  (kube-system / operators)",
                             graph_attr={"bgcolor": "#EFF7EF", "fontsize": "15",
                                         "style": "dashed", "color": "#34A853",
                                         "penwidth": "1.3"}):
                    argocd = Argocd("Argo CD")
                    lbc    = Helm("AWS Load Balancer\nController (IRSA)")
                    eso    = Helm("External Secrets\nOperator (IRSA)")

                with Cluster("namespace: boutique",
                             graph_attr={"bgcolor": "#FFFFFF", "fontsize": "17",
                                         "color": "#666666", "penwidth": "1.5"}):
                    ingress   = Ing("Ingress\n(AWS LBC)")
                    fe_svc    = Service("Service\nfrontend:80")
                    frontend  = Pod("frontend\n:8080")
                    catalog   = Pod("productcatalog\n:3550")
                    checkout  = Pod("checkout\n:5050")
                    cart      = Pod("cartservice\n:7070")
                    redis_pod = Redis("Redis\n:6379\n(cart store)")

                with Cluster("namespace: observability",
                             graph_attr={"bgcolor": "#FFF8E1", "fontsize": "17",
                                         "color": "#F1620E", "penwidth": "1.5"}):
                    prometheus = Prometheus("Prometheus")
                    grafana    = Grafana("Grafana")
                    with Cluster("planned  (not deployed)",
                                 graph_attr={"bgcolor": "#F0F0F0", "fontsize": "14",
                                             "style": "dashed", "color": "#888888",
                                             "penwidth": "1.2"}):
                        otel = Pod("OTel Collector\n(traces)")

    # ── RUNTIME REQUEST PATH  ①→⑤   (labels = PROTOCOL) ──────
    end_user >> Edge(color=C_RUNTIME, penwidth="3.0", label=step(1, "HTTP :80")) >> alb
    alb      >> Edge(color=C_RUNTIME, penwidth="3.0", label=step(2, "HTTP :8080")) >> ingress
    ingress  >> Edge(color=C_RUNTIME, penwidth="2.5", label=step(3, "HTTP")) >> fe_svc
    fe_svc   >> Edge(color=C_RUNTIME, penwidth="2.5", label=step(4, "HTTP :8080")) >> frontend
    frontend >> Edge(color=C_MESH, label=step(5, "gRPC :3550")) >> catalog
    frontend >> Edge(color=C_MESH, label=step(5, "gRPC :7070")) >> cart
    frontend >> Edge(color=C_MESH, label=step(5, "gRPC :5050")) >> checkout
    checkout >> Edge(color=C_MESH, label="gRPC :7070") >> cart
    cart     >> Edge(color=C_MESH, style="dashed", label="TCP :6379") >> redis_pod

    # ── CI/CD + GITOPS  Ⓐ→Ⓕ   (labels = ACTION) ─────────────
    dev         >> Edge(color=C_CICD, penwidth="2.5", label=step_ci(1, "git push")) >> app_repo
    app_repo    >> Edge(color=C_CICD, style="dashed", label=step_ci(2, "trigger on src/**")) >> ci_build
    ci_build    >> Edge(color=C_CICD, penwidth="2.5", label=step_ci(3, "push image\n(cosign + SBOM)")) >> ecr
    ci_build    >> Edge(color=C_CICD, style="dashed",
                        label=step_ci(4, "open image-bump PR")) >> gitops_repo
    gitops_repo >> Edge(color=C_GITOPS, style="dotted", penwidth="2.5",
                        label=step_ci(5, "poll & sync")) >> argocd
    argocd      >> Edge(color=C_GITOPS, style="dotted", penwidth="2.2",
                        lhead="cluster_namespace: boutique",
                        label=step_ci(6, "apply manifests")) >> frontend

    # ── IMAGE PULL (kubelet on node group) ──────────────────
    ecr >> Edge(color=C_STATE, style="dashed",
                lhead="cluster_namespace: boutique", label="pull image") >> frontend

    # ── OIDC (GitHub Actions assume IAM roles — no static keys) ──
    ci_build >> Edge(color=C_STATE, style="dotted", label="assume ECR-push role (OIDC)") >> oidc_role
    ci_plan  >> Edge(color=C_STATE, style="dotted", label="assume TF-plan role (OIDC)") >> oidc_role

    # ── TERRAFORM PLAN (CI) + APPLY (local) ─────────────────
    app_repo >> Edge(color=C_STATE, style="dashed", label="on PR infra/**") >> ci_plan
    ci_plan  >> Edge(color=C_STATE, style="dashed", label="read state + plan") >> tf_state
    dev      >> Edge(color=C_STATE, style="dashed",
                     label="terraform apply (local)") >> tf_state

    # ── SECRETS  (ESO reads Secrets Manager → K8s Secret) ───
    sm  >> Edge(color=C_SECRET, penwidth="2.2", label="GetSecretValue") >> eso
    eso >> Edge(color=C_SECRET, style="dashed",
                lhead="cluster_namespace: boutique",
                label="write K8s Secret") >> frontend

    # ── LBC provisions the ALB from the Ingress object ──────
    lbc >> Edge(color=C_RUNTIME, style="dashed", label="provisions ALB\nfrom Ingress") >> alb

    # ── OBSERVABILITY  (labels = DATA emitted) ──────────────
    frontend   >> Edge(color=C_OBSERV, style="dotted",
                       ltail="cluster_namespace: boutique", label="/metrics") >> prometheus
    frontend   >> Edge(color=C_STATE, style="dotted",
                       ltail="cluster_namespace: boutique",
                       label="OTLP traces\n(planned — code wired,\nENABLE_TRACING=0 today)") >> otel
    otel       >> Edge(color=C_STATE, style="dotted", label="export (planned)") >> grafana
    prometheus >> Edge(color=C_OBSERV, label="datasource") >> grafana
    rds        >> Edge(color=C_OBSERV, style="dashed", label="CPU / storage") >> cw
    alb        >> Edge(color=C_OBSERV, style="dashed", label="5xx errors") >> cw


# ════════════════════════════════════════════════════════════════════════
# DIAGRAM 2 — NETWORK TOPOLOGY  (VPC / AZ / subnets / NAT / IGW)
# ════════════════════════════════════════════════════════════════════════
net_graph_attr = dict(graph_attr)
net_graph_attr.update({"nodesep": "1.0", "ranksep": "1.6"})

with Diagram(
    "Mini E-commerce DevOps Platform — Network Topology (VPC 10.0.0.0/16)",
    filename="docs/architecture-network", outformat="png",
    graph_attr=net_graph_attr, node_attr=node_attr, edge_attr=edge_attr,
    direction="LR", show=False,
):
    internet = Internet("Internet")

    with Cluster("AWS Cloud  •  ap-southeast-1",
                 graph_attr={"bgcolor": "#FFF8F0", "fontsize": "20",
                             "fontname": "Helvetica-Bold", "style": "rounded",
                             "color": "#FF9900", "penwidth": "2.5", "labeljust": "l"}):

        igw = InternetGateway("Internet Gateway")

        with Cluster("VPC  10.0.0.0/16   •   2 AZ (ap-southeast-1a / 1b)",
                     graph_attr={"bgcolor": "#EEF4FF", "fontsize": "18",
                                 "fontname": "Helvetica-Bold",
                                 "color": "#1F6FEB", "penwidth": "2.0", "labeljust": "l"}):

            # Tier 1 — public subnets (one per AZ): ALB ENIs + the single NAT
            with Cluster("Public subnets   •   10.0.101.0/24 (1a)   +   10.0.102.0/24 (1b)",
                         graph_attr={"bgcolor": "#F1FAF1", "fontsize": "16",
                                     "fontname": "Helvetica-Bold",
                                     "color": "#34A853", "penwidth": "1.6", "labeljust": "l"}):
                alb = ALB("Application Load Balancer\n(public • ENI in each AZ)")
                nat = NATGateway("NAT Gateway\nSINGLE - serves both AZ\n(cost-optimized: 1x not 2x)")

            # Tier 2 — private subnets (one per AZ): EKS nodes + RDS
            with Cluster("Private subnets   •   10.0.1.0/24 (1a)   +   10.0.2.0/24 (1b)",
                         graph_attr={"bgcolor": "#F5F0FF", "fontsize": "16",
                                     "fontname": "Helvetica-Bold",
                                     "color": "#8B5CF6", "penwidth": "1.6", "labeljust": "l"}):
                node_a  = EC2("EKS managed node\n1x m7i-flex.large\nON_DEMAND  (AZ 1a)")
                rds_a   = RDS("RDS PostgreSQL 16\ndb.t4g.micro - single-AZ\nplatform DB  (AZ 1a)")
                spare_b = Blank("AZ 1b reserved\n(EKS needs >=2 AZ subnets;\nno node/RDS today)")

    # ── Ingress (public path) — drives the vertical rank ─────
    internet >> Edge(color=C_RUNTIME, penwidth="3.0", label="HTTP :80 (public)") >> igw
    igw      >> Edge(color=C_RUNTIME, penwidth="3.0") >> alb
    alb      >> Edge(color=C_RUNTIME, penwidth="2.5", label="target group :8080") >> node_a

    # ── Egress (private → single NAT → IGW) — constraint=false ──
    node_a >> Edge(color=C_EGRESS, style="dashed", constraint="false",
                   label="egress 0.0.0.0/0\n(ECR pull, AWS API)") >> nat
    nat    >> Edge(color=C_EGRESS, style="dashed", constraint="false", label="SNAT") >> igw

    # ── App → platform DB (private, intra-VPC) ───────────────
    node_a >> Edge(color=C_MESH, style="dotted", constraint="false",
                   label="TCP :5432") >> rds_a


# ════════════════════════════════════════════════════════════════════════
# DIAGRAM 3 — LEGEND
# ════════════════════════════════════════════════════════════════════════
legend_graph_attr = {
    "fontsize": "20", "fontname": "Helvetica-Bold", "bgcolor": "#FAFAFA",
    "dpi": "180", "pad": "0.6", "splines": "ortho",
    "nodesep": "0.3", "ranksep": "0.6",
}
legend_node_attr = {"fontsize": "16", "fontname": "Helvetica-Bold",
                    "margin": "0.15", "width": "0.2", "height": "0.2"}
legend_edge_attr = {"fontsize": "14", "fontname": "Helvetica-Bold",
                    "penwidth": "3.0", "arrowsize": "1.0"}

with Diagram(
    "Architecture Diagrams — Legend",
    filename="docs/architecture-legend", outformat="png",
    graph_attr=legend_graph_attr, node_attr=legend_node_attr,
    edge_attr=legend_edge_attr, direction="LR", show=False,
):
    with Cluster("Edge color = flow type   ·   solid = sync,  dashed = async / pull,  dotted = scrape / planned",
                 graph_attr={"bgcolor": "#FFFFFF", "fontsize": "16",
                             "fontname": "Helvetica-Bold", "style": "rounded",
                             "color": "#444444", "penwidth": "1.5"}):
        pairs = [
            ("[1..5]  Runtime request  (HTTP, gRPC)",    C_RUNTIME, "solid"),
            ("Service mesh -- internal gRPC",            C_MESH,    "solid"),
            ("[A..F]  CI/CD pipeline  (build, push)",    C_CICD,    "dashed"),
            ("GitOps sync  (Argo CD -> cluster)",        C_GITOPS,  "dotted"),
            ("Secrets sync  (ESO <- Secrets Manager)",   C_SECRET,  "solid"),
            ("Observability  (metrics, alarms)",         C_OBSERV,  "dotted"),
            ("Network egress  (private -> NAT -> IGW)",  C_EGRESS,  "dashed"),
            ("Terraform state  +  infra / OIDC",         C_STATE,   "dashed"),
        ]
        for label, color, style in pairs:
            a = Blank("")
            b = Blank(label)
            a >> Edge(color=color, style=style, penwidth="3.0") >> b
