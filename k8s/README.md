# Kubernetes Infrastructure

This directory contains all Kubernetes manifests for the mirai-prototype cluster, organized for GitOps workflows.

## Directory Structure

```
k8s/
├── README.md                      # This file
├── DRIFT_REPORT.md                # Configuration drift analysis
├── kustomization.yaml             # Root kustomization (apply all)
│
├── namespaces/                    # Namespace definitions
│   ├── kustomization.yaml
│   ├── default-namespace.yaml     # Ambient mesh enabled
│   └── ingress-namespace.yaml     # NO ambient mesh
│
├── ingress/                       # Edge ingress (cloudflared)
│   ├── README.md                  # Detailed ingress documentation
│   ├── kustomization.yaml
│   ├── cloudflared-deployment.yaml
│   ├── cloudflared-config.yaml
│   ├── cloudflared-credentials-template.yaml  # Template (not actual secret)
│   └── .gitignore                 # Prevents committing secrets
│
├── frontend/                      # Mirai frontend application
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
│
├── istio/                         # Istio ambient mesh config
│   ├── README.md                  # Istio setup and troubleshooting
│   ├── peer-authentication.yaml   # NOT APPLIED (manual only)
│   ├── destination-rules.yaml
│   ├── external-services.yaml
│   └── coredns-improved.yaml
│
├── monitoring/                    # Prometheus, Grafana, Loki
├── redis/                         # Redis deployment
├── base/                          # Base kustomize templates
├── overlays/                      # Environment-specific overlays
│
├── argocd-frontend-app.yaml       # ArgoCD app for frontend
└── argocd-ingress-app.yaml        # ArgoCD app for ingress
```

## Quick Start

### Apply All Resources

```bash
# Apply everything (namespaces, ingress, frontend, istio)
kubectl apply -k k8s/

# Note: Secrets must be applied separately (not in Git)
kubectl apply -f k8s/ingress/cloudflared-credentials.yaml  # (you must create this)
```

### Apply Specific Components

```bash
# Namespaces only
kubectl apply -k k8s/namespaces/

# Ingress (cloudflared) only
kubectl apply -k k8s/ingress/

# Frontend only
kubectl apply -k k8s/frontend/
```

## Critical Architecture Decisions

### 1. Namespace Isolation for Istio Ambient Mesh

**`ingress` namespace**: NOT in ambient mesh
- cloudflared runs here
- Reason: Edge proxies need direct connectivity, not mesh interception
- Impact: Prevents 502 errors from ztunnel control plane issues

**`default` namespace**: IN ambient mesh
- Application workloads (mirai-frontend, etc.)
- Benefits: Zero-trust mTLS, traffic management, observability

See: `docs/CLOUDFLARE_SUBDOMAIN_SETUP.md` for details

### 2. Secret Management

Secrets are **NEVER** committed to Git. Three options:

1. **Manual (current)**: Apply secrets directly with kubectl
2. **SOPS**: Encrypt secrets, commit encrypted versions
3. **Sealed Secrets**: Use sealed-secrets controller
4. **External Secrets**: Sync from external vault (1Password, AWS, etc.)

See: `k8s/ingress/README.md` for implementation guides

### 3. Istio mTLS Policies

`peer-authentication.yaml` is **NOT applied** to cluster:
- Defines STRICT mTLS but requires stable ztunnel connectivity
- Apply manually only after verifying prerequisites
- See: `k8s/istio/README.md` for prerequisites and procedure

## GitOps with ArgoCD

### Enable ArgoCD Sync

```bash
# Apply ArgoCD applications
kubectl apply -f k8s/argocd-frontend-app.yaml
kubectl apply -f k8s/argocd-ingress-app.yaml

# Verify sync status
kubectl get applications -n argocd
```

### ArgoCD Features Enabled

- **Auto-sync**: Cluster automatically syncs with Git
- **Self-heal**: Cluster reverts manual changes
- **Prune**: Removes resources deleted from Git

## Validation

All manifests have been validated with server-side dry-run:

```bash
# Validate before applying
kubectl apply --dry-run=server -k k8s/

# Validate specific directories
kubectl apply --dry-run=server -k k8s/namespaces/
kubectl apply --dry-run=server -k k8s/ingress/
kubectl apply --dry-run=server -k k8s/frontend/
```

## Repository Scope

This repository manages **only** the mirai.sogos.io application:
- ✅ `mirai-frontend` deployment and service
- ✅ `cloudflared` tunnel (ingress namespace)
- ✅ Istio ambient mesh configuration
- ✅ Namespace definitions

**Other applications** on the cluster (hello-world, product, solutions) are managed in separate repositories and are intentionally not included here.

See `DRIFT_REPORT.md` for detailed scope analysis.

## Configuration Changes Log

### 2025-11-18: cloudflared Namespace Migration

**Change**: Moved cloudflared from `default` to `ingress` namespace

**Reason**: Remove cloudflared from Istio ambient mesh to prevent 502 errors

**Files Changed**:
- Created `k8s/namespaces/ingress-namespace.yaml`
- Moved `cloudflared-ha.yaml` → `k8s/ingress/cloudflared-deployment.yaml`
- Moved `cloudflared-config.yaml` → `k8s/ingress/cloudflared-config.yaml`
- Updated all namespace references from `default` to `ingress`

**Cluster Impact**: Resolved intermittent 502 errors for all *.sogos.io domains

**Git Commit**: [pending]

## Best Practices

1. **Never commit secrets**: Use templates or encrypted versions only
2. **Validate before commit**: Run `kubectl apply --dry-run=server -k k8s/`
3. **Use kustomize**: Organize with base + overlays for environments
4. **Document drift**: Update `DRIFT_REPORT.md` when manual changes are made
5. **ArgoCD for production**: Automate sync to prevent manual drift

## Troubleshooting

### Issue: kubectl apply fails with "field is immutable"

**Cause**: Trying to change immutable fields (like selector) on existing resources

**Solution**: Delete and recreate the resource, or use `kubectl replace --force`

### Issue: Secret not found errors

**Cause**: Secrets are not in Git (by design)

**Solution**: Apply secrets manually or set up secret management solution

### Issue: 502 errors from cloudflared

**Cause**: cloudflared might be in ambient mesh

**Solution**: Verify it's in `ingress` namespace:
```bash
kubectl get pods -n ingress -l app=cloudflared
kubectl get namespace ingress -o jsonpath='{.metadata.labels}'
# Should NOT have istio.io/dataplane-mode=ambient
```

## Related Documentation

- `docs/CLOUDFLARE_SUBDOMAIN_SETUP.md` - Cloudflare tunnel configuration
- `docs/ISTIO_ZTUNNEL_AMBIENT_MESH.md` - Istio ambient mesh setup
- `docs/DEPLOYMENT.md` - General deployment guide
- `docs/GITOPS_WORKFLOW.md` - GitOps workflow
- `k8s/ingress/README.md` - Ingress namespace details
- `k8s/istio/README.md` - Istio configuration details
- `k8s/DRIFT_REPORT.md` - Configuration drift analysis
