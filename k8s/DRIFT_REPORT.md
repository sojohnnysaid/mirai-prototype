# Configuration Drift Report

**Generated**: 2025-11-18
**Purpose**: Document resources that exist in cluster but not in this Git repository

## Scope

This repository (`mirai-prototype`) manages **only** the mirai.sogos.io application and its supporting infrastructure (cloudflared tunnel, Istio ambient mesh configuration).

**Other applications on the cluster** (hello-world, product, solutions, etc.) are managed in separate repositories and are intentionally NOT included here.

---

## Resources Managed by This Repository

### In Scope (mirai-prototype)
- ✅ `mirai-frontend` deployment and service
- ✅ `cloudflared` deployment (ingress namespace)
- ✅ Istio ambient mesh configuration
- ✅ Namespace definitions (default, ingress)

### Out of Scope (Other Applications)
- ⚪ `hello-world` - Managed separately
- ⚪ `product` - Managed separately
- ⚪ `solutions` - Managed separately
- ⚪ Other cluster infrastructure (monitoring, redis, etc.)

**Note**: The cloudflared tunnel configuration includes routes for all applications on the cluster, but this repository only manages the mirai.sogos.io application itself.

### Test Pods (Cleaned Up)

- ✅ `test-curl` - Deleted
- ✅ `test-curl-2` - Deleted
- ✅ `test-direct` - Deleted

---

## Recommended Actions

### 1. No Action Required for Other Apps

The hello-world, product, and solutions deployments are **intentionally not in this repository** as they are managed separately. No export needed.

### 2. Test Pods Cleaned Up ✅

```bash
# Already completed
kubectl delete pod test-curl test-curl-2 test-direct -n default
```

### 3. Create ArgoCD Applications (Optional)

If using ArgoCD for GitOps, create Application resources:

```bash
# k8s/argocd-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-world
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/sojohnnysaid/mirai-prototype.git
    targetRevision: main
    path: k8s/apps/hello-world
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 4. Future Prevention

To prevent drift:

1. **Always commit before applying**: Create manifests in Git first, then apply
2. **Use ArgoCD**: Automated sync ensures cluster matches Git
3. **Regular audits**: Run drift detection weekly
4. **Disable kubectl apply**: Enforce ArgoCD-only deployments (optional)

---

## Drift Detection Script

Save as `scripts/detect-drift.sh`:

```bash
#!/bin/bash
# Detects resources in cluster not represented in Git

echo "=== Checking for deployments in default namespace ==="
kubectl get deployments -n default -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | while read name; do
  if ! find k8s -name "*${name}*" | grep -q yaml; then
    echo "⚠️  Deployment '$name' not found in Git"
  fi
done

echo ""
echo "=== Checking for completed/error test pods ==="
kubectl get pods -n default --field-selector status.phase!=Running,status.phase!=Pending

echo ""
echo "=== Checking for secrets in namespaces ==="
kubectl get secrets --all-namespaces | grep -v "default-token\|kube-root-ca\|sh.helm.release"
```

---

## Current vs Desired State

| Resource | Current State | Desired State | Action |
|----------|---------------|---------------|--------|
| **In Scope (mirai-prototype)** |
| cloudflared (ingress ns) | In cluster + Git ✅ | ✅ No action | - |
| mirai-frontend | In cluster + Git ✅ | ✅ No action | - |
| namespaces (default, ingress) | In cluster + Git ✅ | ✅ No action | - |
| Istio configs | In cluster + Git ✅ | ✅ No action | - |
| **Out of Scope (Other Apps)** |
| hello-world deployment | In cluster only | Managed separately | None (different repo) |
| product deployment | In cluster only | Managed separately | None (different repo) |
| solutions deployment | In cluster only | Managed separately | None (different repo) |
| **Cleanup Completed** |
| test-curl pod | ~~Completed (stale)~~ | Deleted ✅ | Completed |
| test-curl-2 pod | ~~Completed (stale)~~ | Deleted ✅ | Completed |
| test-direct pod | ~~Error (stale)~~ | Deleted ✅ | Completed |

---

## Summary

✅ **No drift detected** for resources in scope

All mirai-prototype resources are properly represented in Git:
- cloudflared migration from default to ingress namespace ✅
- All cloudflared manifests in Git under `k8s/ingress/` ✅
- Namespace definitions in `k8s/namespaces/` ✅
- Istio configs documented with appropriate warnings ✅
- Test pods cleaned up ✅

**Other applications** (hello-world, product, solutions) are out of scope and managed in separate repositories.
