# Istio Ambient Mesh Configuration

This directory contains Istio service mesh configuration for the cluster running in ambient mode (sidecar-less architecture).

## Current Status

**Istio Version**: 1.24.0
**Mode**: Ambient (using ztunnel, no sidecars)
**Ambient-Enrolled Namespaces**:
- `default` - application workloads (mirai-frontend, etc.)
- `monitoring` - Prometheus, Grafana, etc.

**Non-Ambient Namespaces**:
- `ingress` - Edge ingress proxies (cloudflared) - **must stay outside mesh**

## Files

### Applied Configurations

- `coredns-improved.yaml` - Enhanced CoreDNS configuration
- `destination-rules.yaml` - Traffic policy rules
- `external-services.yaml` - ServiceEntry for external services

### NOT Applied (Intentionally)

- **`peer-authentication.yaml`** - mTLS policies (STRICT mode)
  - ⚠️ **NOT CURRENTLY APPLIED TO CLUSTER**
  - Defines STRICT mTLS for default, istio-system, and monitoring namespaces
  - Requires healthy ztunnel connectivity to istiod before enabling
  - See "Prerequisites for Enabling STRICT mTLS" below

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Cluster Namespaces                                       │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │   ingress    │     │   default    │                 │
│  │              │     │              │                 │
│  │ cloudflared  │────>│ mirai-       │                 │
│  │              │ HTTP│ frontend     │                 │
│  │              │     │              │                 │
│  │ NO AMBIENT   │     │ AMBIENT      │                 │
│  │ NO ZTUNNEL   │     │ + ZTUNNEL    │                 │
│  └──────────────┘     └──────────────┘                 │
│                                                          │
│  ┌──────────────────────────────────┐                  │
│  │  istio-system                    │                  │
│  │                                  │                  │
│  │  istiod (control plane)          │                  │
│  │  ztunnel (DaemonSet)             │                  │
│  │  istio-cni                       │                  │
│  └──────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## Namespace Ambient Enrollment

To enroll a namespace in ambient mesh:

```bash
kubectl label namespace <namespace> istio.io/dataplane-mode=ambient
```

To remove from ambient mesh:

```bash
kubectl label namespace <namespace> istio.io/dataplane-mode-
```

**Current enrollment**:
```bash
# View current ambient namespaces
kubectl get namespaces -l istio.io/dataplane-mode=ambient
```

## mTLS Configuration

### Current State: PERMISSIVE (default)

With no PeerAuthentication policies applied, Istio ambient defaults to **PERMISSIVE** mode:
- Accepts both mTLS and plaintext traffic
- Workloads can communicate without mTLS handshakes
- Provides ambient mesh benefits (telemetry, routing) without strict security

### Prerequisites for Enabling STRICT mTLS

Before applying `peer-authentication.yaml`, ensure:

1. **ztunnel health is stable**:
   ```bash
   kubectl get pods -n istio-system -l app=ztunnel
   # All pods should be 1/1 READY
   ```

2. **ztunnel can reach istiod reliably**:
   ```bash
   kubectl logs -n istio-system -l app=ztunnel --tail=100 | grep -i "error\|failed"
   # Should not show repeated DNS errors or XDS connection failures
   ```

3. **CoreDNS is healthy**:
   ```bash
   kubectl get pods -n kube-system -l k8s-app=kube-dns
   # All pods should be Running
   ```

4. **Test ambient mesh connectivity**:
   ```bash
   # From a pod in default namespace
   kubectl run test-ambient --image=nicolaka/netshoot -n default --rm -i -- \
     curl -m 5 http://mirai-frontend.default.svc.cluster.local:80
   # Should succeed without timeouts
   ```

### Applying STRICT mTLS

**Only after verifying prerequisites above**:

```bash
# Apply PeerAuthentication policies
kubectl apply -f k8s/istio/peer-authentication.yaml

# Verify policies are created
kubectl get peerauthentication --all-namespaces

# Monitor for connection issues
kubectl logs -n istio-system -l app=ztunnel --tail=50 -f
```

### If Issues Occur After Enabling STRICT mTLS

If you see "connection reset by peer" or timeout errors:

```bash
# Immediately revert to PERMISSIVE
kubectl delete peerauthentication --all --all-namespaces

# Investigate ztunnel health
kubectl describe pods -n istio-system -l app=ztunnel

# Check istiod connectivity
kubectl logs -n istio-system -l app=ztunnel | grep -E "istiod|XDS|identity"
```

## Monitoring Ambient Mesh

```bash
# Check ztunnel status
kubectl get pods -n istio-system -l app=ztunnel -o wide

# View ztunnel logs
kubectl logs -n istio-system -l app=ztunnel --tail=100

# Check which workloads are in the mesh
# (requires istioctl - may not be available)
istioctl ztunnel-config workloads -n default

# View access logs (if enabled)
kubectl logs -n istio-system -l app=ztunnel | grep "access"
```

## Common Issues

### Issue: Intermittent 502 Errors from cloudflared

**Symptom**: External requests to *.sogos.io return 502 errors intermittently

**Cause**: cloudflared enrolled in ambient mesh while ztunnel has control plane issues

**Solution**: Ensure cloudflared runs in `ingress` namespace (not `default`)
- See `k8s/ingress/README.md`
- See `docs/CLOUDFLARE_SUBDOMAIN_SETUP.md`

### Issue: ztunnel Pods Not Ready

**Symptom**: ztunnel pods show 0/1 READY status

**Cause**: Cannot connect to istiod on port 15012

**Solution**: See `docs/ISTIO_ZTUNNEL_AMBIENT_MESH.md` troubleshooting section

### Issue: Pods Cannot Communicate After Enabling STRICT mTLS

**Symptom**: Connection resets, timeouts between pods in ambient namespaces

**Cause**: ztunnel cannot issue/validate certificates due to istiod connectivity issues

**Solution**: Revert STRICT mTLS policies, fix ztunnel/istiod connectivity first

## Related Documentation

- `docs/ISTIO_ZTUNNEL_AMBIENT_MESH.md` - Complete Istio ambient setup and troubleshooting
- `docs/CLOUDFLARE_SUBDOMAIN_SETUP.md` - Cloudflare tunnel and ambient mesh compatibility
- [Istio Ambient Mesh Official Docs](https://istio.io/latest/docs/ambient/)
