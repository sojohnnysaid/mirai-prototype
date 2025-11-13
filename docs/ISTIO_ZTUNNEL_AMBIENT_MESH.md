# Istio Ambient Mesh with ztunnel - Installation and Troubleshooting Guide

## Overview

This document covers the installation, configuration, and troubleshooting of Istio's ambient mesh mode using ztunnel (zero-trust tunnel) in a Kubernetes cluster. Ambient mesh is Istio's sidecar-less data plane architecture that provides transparent service mesh capabilities without injecting sidecars into application pods.

## Architecture

### Key Components

1. **istiod** - The Istio control plane that manages configuration and certificates
2. **ztunnel** - A per-node proxy (DaemonSet) that handles L4 traffic and mTLS
3. **istio-cni** - CNI plugin that configures traffic redirection to ztunnel
4. **Waypoint proxies** - Optional L7 proxies for advanced features (not covered here)

### How Ambient Mesh Works

- ztunnel runs as a DaemonSet with one pod per node
- Captures all pod traffic transparently using iptables rules via istio-cni
- Provides zero-trust networking with automatic mTLS between services
- Uses HBONE (HTTP Based Overlay Network Encapsulation) protocol for secure communication

## Prerequisites

- Kubernetes cluster v1.28+ (tested on v1.34.0)
- Flannel CNI or compatible overlay network
- kubectl and istioctl CLI tools
- Cluster admin permissions

## Installation

### 1. Download and Install Istio

```bash
# Download Istio 1.24.0
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
cd istio-1.24.0

# Add istioctl to PATH
export PATH=$PWD/bin:$PATH
```

### 2. Install Istio with Ambient Profile

```bash
# Install Istio with ambient profile
istioctl install --set values.pilot.env.PILOT_ENABLE_AMBIENT=true \
                  --set profile=ambient \
                  --set components.ingressGateways[0].enabled=true \
                  --set components.ingressGateways[0].name=istio-ingressgateway \
                  -y

# Verify installation
kubectl get pods -n istio-system
kubectl get daemonset -n istio-system
```

### 3. Enable Ambient Mesh for a Namespace

```bash
# Label namespace for ambient mesh
kubectl label namespace default istio.io/dataplane-mode=ambient

# Verify the label
kubectl get namespace default -o yaml | grep istio.io/dataplane-mode
```

## Verification Commands

### Check ztunnel Status

```bash
# Check ztunnel pods (should be 1/1 READY)
kubectl get pods -n istio-system -l app=ztunnel

# Check ztunnel logs
kubectl logs -n istio-system -l app=ztunnel --tail=50

# Check ztunnel certificates
istioctl ztunnel-config certificates <ztunnel-pod-name>.istio-system

# Check ztunnel workloads
istioctl ztunnel-config workloads <ztunnel-pod-name>.istio-system

# Check all ztunnel configurations
istioctl ztunnel-config all <ztunnel-pod-name>.istio-system
```

### Check istiod Status

```bash
# Check istiod pod
kubectl get pods -n istio-system -l app=istiod

# Check istiod endpoints
kubectl get endpoints -n istio-system istiod

# Check istiod service
kubectl get svc istiod -n istio-system
```

## Common Issues and Troubleshooting

### Issue 1: ztunnel Pods Not Ready (0/1)

**Symptoms:**
- ztunnel pods show 0/1 READY status
- Logs show "connection refused" or "deadline has elapsed" errors
- No certificates or workloads shown in ztunnel-config

**Root Cause:**
ztunnel cannot connect to istiod on port 15012 (xDS port)

**Diagnosis Steps:**

1. **Check if istiod is listening on port 15012:**
```bash
# Get istiod pod name
ISTIOD=$(kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[0].metadata.name}')

# Check if port 15012 is in the service
kubectl get svc istiod -n istio-system -o yaml | grep -A5 "port: 15012"

# Verify istiod is actually listening (using debug container)
kubectl debug -it $ISTIOD -n istio-system --image=nicolaka/netshoot --target=discovery -- ss -ltnp | grep 15012
```

2. **Test connectivity from ztunnel to istiod:**
```bash
# Create a test pod on the same node as ztunnel
kubectl run test-connectivity --image=nicolaka/netshoot -n istio-system --restart=Never -- sleep 3600

# Test connectivity to istiod
kubectl exec test-connectivity -n istio-system -- nc -zv istiod.istio-system.svc.cluster.local 15012

# Clean up
kubectl delete pod test-connectivity -n istio-system
```

### Issue 2: Cross-Node Pod Communication Failure

**Symptoms:**
- Pods on different nodes cannot communicate
- ztunnel only works on the same node as istiod
- New pod creation fails with "no ztunnel connection" error

**Root Cause:**
Overlay network (Flannel/VXLAN) failure preventing cross-node communication

**Diagnosis Steps:**

1. **Deploy diagnostic DaemonSet:**
```yaml
# Save as vxlan-debug.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vxlan-debug
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: vxlan-debug
  template:
    metadata:
      labels:
        app: vxlan-debug
    spec:
      hostNetwork: true
      containers:
      - name: netshoot
        image: nicolaka/netshoot
        command: ["sleep", "3600"]
        securityContext:
          privileged: true
```

```bash
kubectl apply -f vxlan-debug.yaml
```

2. **Check VXLAN interface and port:**
```bash
# Check if flannel interface exists on each node
kubectl exec -it <vxlan-debug-pod> -n kube-system -- ip link | grep flannel

# Check if UDP port 4789 is listening (Flannel VXLAN)
kubectl exec -it <vxlan-debug-pod> -n kube-system -- ss -lun | grep 4789

# Test cross-node connectivity
kubectl exec -it <vxlan-debug-pod-node1> -n kube-system -- nc -zv <node2-ip> 4789
```

3. **Fix Flannel issues:**
```bash
# Restart flannel pod on affected node
kubectl delete pod <flannel-pod-name> -n kube-system --force --grace-period=0

# Verify flannel recreated the interface
kubectl exec -it <vxlan-debug-pod> -n kube-system -- ip link | grep flannel

# Verify UDP 4789 is now listening
kubectl exec -it <vxlan-debug-pod> -n kube-system -- ss -lun | grep 4789
```

### Issue 3: istio-cni Blocking Pod Creation

**Symptoms:**
- New pods stuck in ContainerCreating state
- Error: "plugin type=istio-cni failed (add): unable to push CNI event (status code 500): partial add error: no ztunnel connection"

**Root Cause:**
istio-cni requires ztunnel to be running and connected before allowing new pods

**Solution:**
1. Fix ztunnel connectivity issues first (see Issues 1 and 2)
2. Once ztunnel is connected, new pods will start normally

### Issue 4: Pods Not Showing HBONE Protocol

**Symptoms:**
- Workloads show TCP protocol instead of HBONE in ztunnel-config
- No automatic mTLS between services

**Root Cause:**
Namespace not labeled for ambient mesh

**Solution:**
```bash
# Label namespace for ambient
kubectl label namespace <namespace> istio.io/dataplane-mode=ambient

# Restart pods in the namespace to pick up ambient configuration
kubectl rollout restart deployment -n <namespace>
```

## Monitoring and Observability

### Check Ambient Mesh Metrics

```bash
# Check ztunnel metrics
kubectl exec -n istio-system <ztunnel-pod> -- curl -s localhost:15020/stats/prometheus | grep -E "istio_build|istio_tcp_connections"

# Check istiod metrics
kubectl exec -n istio-system <istiod-pod> -- curl -s localhost:15014/metrics | grep -E "pilot_xds_pushes|pilot_proxy_convergence_time"
```

### Debug Configuration

```bash
# Get ztunnel configuration dump
kubectl exec -n istio-system <ztunnel-pod> -- curl -s localhost:15000/config_dump > ztunnel-config.json

# Check ztunnel state
kubectl exec -n istio-system <ztunnel-pod> -- curl -s localhost:15000/state/info
```

## Best Practices

1. **Pre-Installation Checks:**
   - Verify cross-node pod connectivity before installing Istio
   - Ensure CNI (Flannel/Calico/etc.) is healthy
   - Check that no network policies block istio-system namespace

2. **Post-Installation Verification:**
   - Always verify ztunnel pods are READY (1/1)
   - Check certificates are issued: `istioctl ztunnel-config certificates`
   - Verify workloads are discovered: `istioctl ztunnel-config workloads`

3. **Namespace Management:**
   - Label namespaces for ambient gradually
   - Test with non-critical namespaces first
   - Monitor application behavior after enabling ambient

4. **Troubleshooting Approach:**
   - Start with network layer (can pods communicate?)
   - Check control plane (is istiod healthy?)
   - Verify data plane (are ztunnel pods connected?)
   - Review application layer last

## Cleanup

### Remove Ambient Mesh from Namespace

```bash
# Remove ambient label
kubectl label namespace default istio.io/dataplane-mode-

# Restart pods to remove ambient configuration
kubectl rollout restart deployment -n default
```

### Uninstall Istio

```bash
# Uninstall Istio completely
istioctl uninstall --purge -y

# Remove namespace
kubectl delete namespace istio-system

# Remove CRDs
kubectl get crd -o name | grep istio.io | xargs kubectl delete
```

## References

- [Istio Ambient Mesh Documentation](https://istio.io/latest/docs/ambient/)
- [ztunnel Architecture](https://istio.io/latest/docs/ambient/architecture/)
- [Ambient Mesh Getting Started](https://istio.io/latest/docs/ambient/getting-started/)
- [istioctl ztunnel-config Reference](https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-ztunnel-config)

## Troubleshooting Summary

| Issue | Symptom | Root Cause | Solution |
|-------|---------|------------|----------|
| ztunnel not ready | 0/1 READY status | Cannot connect to istiod:15012 | Check network connectivity, Service configuration |
| Cross-node failure | Pods can't reach other nodes | Overlay network (VXLAN) broken | Restart flannel, check UDP 4789 |
| Pod creation blocked | ContainerCreating forever | istio-cni needs ztunnel | Fix ztunnel first |
| No HBONE protocol | Workloads show TCP only | Namespace not labeled | Add istio.io/dataplane-mode=ambient label |

## Support

For issues specific to this cluster:
- Check Talos Linux network configuration
- Verify flannel is healthy on all nodes
- Ensure UDP port 4789 is not blocked between nodes
- Review cluster-specific network policies

Last Updated: November 2025
Tested with: Istio 1.24.0, Kubernetes v1.34.0, Talos Linux v1.11.2, Flannel CNI