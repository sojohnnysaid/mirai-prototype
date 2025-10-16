# 🚀 Mirai Prototype

A GitOps-driven web application deployed on a Talos Linux Kubernetes homelab cluster using ArgoCD for continuous deployment and Cloudflare Tunnel for secure external access.

---

## 📋 Overview

This project demonstrates a complete modern deployment pipeline:

- **Application**: Simple web application served via nginx
- **Cluster**: 3-node HA Talos Linux Kubernetes cluster (Mac Mini hardware)
- **GitOps**: ArgoCD automatically syncs from GitHub to Kubernetes
- **Ingress**: Cloudflare Tunnel provides secure HTTPS access without port forwarding
- **Security**: Runs with strict pod security policies (non-root, minimal privileges)

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
              Cloudflare Edge (HTTPS)
                       │
            ┌──────────▼──────────┐
            │ Cloudflare Tunnel   │
            │  (Outbound Only)    │
            └──────────┬──────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│              Talos Kubernetes Cluster                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  cloudflared Pod                                    │   │
│  │  - Maintains tunnel to Cloudflare                   │   │
│  │  - Routes: mirai-prototype.sogos.io                │   │
│  └────────────┬───────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼───────────────────────────────────────┐   │
│  │  mirai-prototype Service (ClusterIP)               │   │
│  │  - Internal: port 80 → 8080                        │   │
│  └────────────┬───────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼───────────────────────────────────────┐   │
│  │  mirai-prototype Pods (2 replicas)                 │   │
│  │  - nginxinc/nginx-unprivileged:alpine              │   │
│  │  - Non-root security context                       │   │
│  │  - Serves content from ConfigMap                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ArgoCD                                             │   │
│  │  - Watches GitHub repo                              │   │
│  │  - Auto-syncs changes to cluster                    │   │
│  │  - Self-healing enabled                             │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ Pulls changes
                       ▼
              ┌─────────────────┐
              │  GitHub Repo    │
              │  (main branch)  │
              └─────────────────┘
```

---

## 📁 Project Structure
```
mirai-prototype/
├── README.md                      # This file
├── hello-world.yaml               # Legacy manifest (not used by ArgoCD)
├── index.html                     # Reference HTML (content in ConfigMap)
└── k8s/
    └── base/
        ├── kustomization.yaml     # Kustomize manifest list
        ├── deployment.yaml        # Pod specification
        ├── service.yaml           # Internal service definition
        └── configmap.yaml         # HTML content
```

---

## 🔧 Technical Details

### Application Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | nginxinc/nginx-unprivileged:alpine | Web server (runs as non-root) |
| **Orchestration** | Kubernetes 1.34.0 | Container orchestration |
| **OS** | Talos Linux v1.11.2 | Immutable OS for Kubernetes |
| **GitOps** | ArgoCD v3.1.8 | Continuous deployment |
| **Ingress** | Cloudflare Tunnel | Secure external access |

### Security Features

- **Non-root containers**: Runs as user 101 (nginx)
- **Minimal capabilities**: All Linux capabilities dropped
- **No privilege escalation**: `allowPrivilegeEscalation: false`
- **Seccomp profile**: `RuntimeDefault`
- **Read-only root filesystem**: ConfigMap mounted for content

### Networking

- **Internal Service**: `mirai-prototype.default.svc.cluster.local:80`
- **Container Port**: 8080 (nginx-unprivileged default)
- **External URL**: https://mirai-prototype.sogos.io
- **DNS**: Managed by Cloudflare
- **Tunnel**: No inbound firewall ports required

---

## 🚀 Deployment Workflow

### Initial Setup (One-time)

1. **Install ArgoCD** in the cluster
2. **Create Cloudflare Tunnel** with DNS routing
3. **Create ArgoCD Application** pointing to this repo
4. **Enable auto-sync** with prune and self-heal

### Daily Development Workflow
```bash
# 1. Make changes to Kubernetes manifests
vim k8s/base/configmap.yaml

# 2. Commit and push to GitHub
git add k8s/base/configmap.yaml
git commit -m "Update homepage content"
git push origin main

# 3. ArgoCD automatically detects changes (within ~3 minutes)
# 4. Changes are deployed to the cluster
# 5. New pods roll out with zero downtime
# 6. Changes are live at https://mirai-prototype.sogos.io
```

**No manual `kubectl apply` needed!** ArgoCD handles everything automatically.

---

## 📊 Monitoring & Management

### Check Application Status
```bash
# View pods
kubectl get pods -l app=mirai-prototype

# View service
kubectl get svc mirai-prototype

# View logs
kubectl logs -l app=mirai-prototype -f
```

### ArgoCD Management

Access ArgoCD UI via port-forward:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:80
```

Then open: http://localhost:8080

Login:
- **Username**: `admin`
- **Password**: 
```bash
  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### ArgoCD CLI Commands
```bash
# Install CLI
brew install argocd

# Login
argocd login localhost:8080 --username admin --insecure

# View application
argocd app get mirai-prototype

# Manual sync (if needed)
argocd app sync mirai-prototype

# View sync history
argocd app history mirai-prototype
```

---

## 🔄 GitOps Sync Policies

The ArgoCD application is configured with:

- **Auto-sync**: Enabled (polls every ~3 minutes)
- **Prune**: Enabled (removes resources deleted from Git)
- **Self-heal**: Enabled (reverts manual cluster changes)
- **Create Namespace**: Enabled

This means:
- ✅ Changes in Git are automatically deployed
- ✅ Manual changes to the cluster are automatically reverted
- ✅ Deleted manifests result in deleted resources
- ✅ The cluster always matches Git (source of truth)

---

## 🛠️ Troubleshooting

### Application Not Accessible
```bash
# Check if pods are running
kubectl get pods -l app=mirai-prototype

# Check service endpoints
kubectl get endpoints mirai-prototype

# Check cloudflared logs
kubectl logs -l app=cloudflared --tail=50

# Test internal connectivity
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl http://mirai-prototype.default.svc.cluster.local:80
```

### ArgoCD Not Syncing
```bash
# Check ArgoCD application status
kubectl get application mirai-prototype -n argocd -o yaml

# View ArgoCD logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Force refresh
argocd app sync mirai-prototype --force
```

### Pod Crashes or ImagePullBackOff
```bash
# View pod events
kubectl describe pod <pod-name>

# View pod logs
kubectl logs <pod-name>

# Check security context issues
kubectl get pod <pod-name> -o yaml | grep -A 10 securityContext
```

---

## 📝 Making Changes

### Update HTML Content

Edit `k8s/base/configmap.yaml`:
```yaml
data:
  index.html: |
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Mirai Prototype</title>
      <style>
        /* Your CSS here */
      </style>
    </head>
    <body>
      <h1>Your New Content</h1>
    </body>
    </html>
```

Commit and push - ArgoCD will deploy automatically.

### Scale Replicas

Edit `k8s/base/deployment.yaml`:
```yaml
spec:
  replicas: 3  # Change from 2 to 3
```

### Add Environment Variables
```yaml
containers:
- name: mirai-prototype
  image: nginxinc/nginx-unprivileged:alpine
  env:
  - name: MY_VAR
    value: "my-value"
```

---

## 🌐 External Access

The application is accessible at:

**https://mirai-prototype.sogos.io**

This URL is:
- ✅ Secured with Cloudflare's SSL/TLS
- ✅ Protected by Cloudflare's DDoS protection
- ✅ Accessible from anywhere on the internet
- ✅ No port forwarding or firewall changes required

---

## 🔐 Security Considerations

### What's Secure

- No public IP exposure (outbound-only tunnel)
- No open firewall ports
- Non-root container execution
- Minimal Linux capabilities
- Immutable infrastructure (GitOps)
- Automatic security updates via image updates

### Best Practices Implemented

- Least privilege security contexts
- Seccomp profiles enabled
- Read-only root filesystems where possible
- ConfigMap for content (not baked into image)
- Replicas for high availability

---

## 📚 Related Documentation

- [Talos Linux Documentation](https://www.talos.dev/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

## 🎓 What We Learned

This project demonstrates:

1. **GitOps Principles**: Git as the single source of truth
2. **Declarative Infrastructure**: Everything defined in YAML
3. **Continuous Deployment**: Automatic deployment from Git
4. **Security Hardening**: Running containers with minimal privileges
5. **Cloud-Native Networking**: Service mesh and tunnel-based ingress
6. **High Availability**: Multiple replicas with automatic failover

---

## 🚧 Future Enhancements

Potential improvements:

- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Implement health checks and readiness probes
- [ ] Add Prometheus monitoring
- [ ] Implement Grafana dashboards
- [ ] Add automated testing
- [ ] Set up staging environment
- [ ] Implement blue-green deployments
- [ ] Add resource limits and requests
- [ ] Implement horizontal pod autoscaling

---

## 📄 License

This is a prototype project for learning and experimentation.

---

**Built with ❤️ on Talos Linux Kubernetes**

*Last Updated: October 16, 2025*

---

## 🔄 CI/CD Pipeline

### Automated Deployment Flow

1. **Code Changes** → Push to `main` branch
2. **GitHub Actions** → Builds Docker image
3. **Container Registry** → Pushes to GitHub Container Registry (ghcr.io)
4. **ArgoCD** → Detects new image and syncs
5. **Kubernetes** → Rolling update with zero downtime
6. **Live** → Changes appear at https://mirai.sogos.io

### Initial Setup
```bash
# Run setup script
./scripts/setup-cicd.sh

# Push to GitHub
git add .
git commit -m "Setup CI/CD pipeline"
git push origin main

# Deploy with ArgoCD
kubectl apply -f k8s/argocd-frontend-app.yaml
argocd app sync mirai-frontend
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Quick Commands
```bash
# Watch deployment
kubectl get pods -l app=mirai-frontend -w

# View logs
kubectl logs -l app=mirai-frontend -f

# Check ArgoCD status
argocd app get mirai-frontend

# Force sync
argocd app sync mirai-frontend
```
