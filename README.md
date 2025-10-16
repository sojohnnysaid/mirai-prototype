
# 🌐 Hello World on Talos Homelab via Cloudflare Tunnel

This guide walks through deploying a simple **Hello World web app** on your **Talos Linux homelab** Kubernetes cluster and exposing it securely on the internet using **Cloudflare Tunnel** — no port forwarding, no public IP exposure.

---

## 🧱 Prerequisites

- ✅ A running **Talos Linux** Kubernetes cluster (HA or single-node)
- ✅ `kubectl` configured to access the cluster
- ✅ A **Cloudflare account** with your domain (`sogos.io`) already added
- ✅ The **cloudflared** CLI installed (on your local Mac or inside the cluster)

```bash
brew install cloudflared
```

---

## 🚀 1. Create the Hello World App

Create a working directory from your applications development root directory:

```bash
mkdir hello-world
cd hello-world
```

Add the **HTML page**:

```bash
cat > index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hello World</title>
  <style>
    body {
      font-family: sans-serif;
      background-color: #111;
      color: #00ffcc;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
  </style>
</head>
<body>
  <h1>Hello from Talos Homelab!</h1>
</body>
</html>
EOF
```

---

## ⚙️ 2. Deploy on Kubernetes

Create `hello-world.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: hello-world
        image: nginx:alpine
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          capabilities:
            drop:
              - ALL
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: hello-world-html
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: hello-world-html
data:
  index.html: |
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Hello from Talos Homelab!</h1>
    </body>
    </html>
---
apiVersion: v1
kind: Service
metadata:
  name: hello-world
spec:
  selector:
    app: hello-world
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
```

Apply it:

```bash
kubectl apply -f hello-world.yaml
```

Check the pods:

```bash
kubectl get pods -l app=hello-world
```

If you have **only control-plane nodes**, untaint them so workloads can run:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

When the pod shows `Running`, test locally:

```bash
curl http://192.168.1.223:30080
```

---

## ☁️ 3. Configure Cloudflare Tunnel

### Step 1: Log in

Authenticate with Cloudflare (select your `sogos.io` domain):

```bash
cloudflared tunnel login
```

### Step 2: Create a tunnel

```bash
cloudflared tunnel create talos-homelab
```

This creates a JSON credential file in `~/.cloudflared/`.

### Step 3: Configure the tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /Users/<your-username>/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: hello.sogos.io
    service: http://192.168.1.223:30080
  - service: http_status:404
```

Replace:
- `<YOUR-TUNNEL-UUID>` with your tunnel ID
- `192.168.1.223` with the node hosting your `hello-world` service

### Step 4: Create DNS route

```bash
cloudflared tunnel route dns talos-homelab hello.sogos.io
```

This automatically adds a proxied DNS record in Cloudflare.

### Step 5: Run the tunnel

```bash
cloudflared tunnel run talos-homelab
```

You’ll see logs like:
```
INF Registered tunnel connection ... location=ewr01 protocol=quic
```

That means your tunnel is live.

Visit:

👉 **https://hello.sogos.io**

You should now see your Hello World page — securely served through Cloudflare’s edge!

---

## 🔁 4. Run as a Persistent Service (optional)

Keep the tunnel always running:

```bash
cloudflared service install
```

This installs a background macOS service.

---

## 🧩 5. Run Cloudflared Inside Kubernetes (optional)

You can also deploy `cloudflared` *inside your cluster* to keep the tunnel live even if your Mac is offline.

Create `cloudflared-deploy.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflared-credentials
type: Opaque
stringData:
  credentials.json: |
    # Paste contents of ~/.cloudflared/<YOUR-TUNNEL-UUID>.json here
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflared
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
      - name: cloudflared
        image: cloudflare/cloudflared:latest
        args: ["tunnel", "--no-autoupdate", "run", "talos-homelab"]
        volumeMounts:
        - name: creds
          mountPath: /etc/cloudflared
      volumes:
      - name: creds
        secret:
          secretName: cloudflared-credentials
```

Apply it:

```bash
kubectl apply -f cloudflared-deploy.yaml
```

Now your homelab tunnel will persist entirely within Kubernetes.

---

## ✅ Summary

| Step | Description |
|------|--------------|
| 1️⃣ | Deploy Hello World on Talos cluster |
| 2️⃣ | Expose with NodePort (port 30080) |
| 3️⃣ | Create a Cloudflare Tunnel |
| 4️⃣ | Route DNS `hello.sogos.io` to the tunnel |
| 5️⃣ | Verify it’s live at `https://hello.sogos.io` |
| 6️⃣ | (Optional) Run cloudflared as a background service or Kubernetes pod |

---

## 🧠 Notes

- No port forwarding or public IP exposure — Cloudflare Tunnel makes an **outbound-only** connection.
- Your Talos cluster remains **HA**, **secure**, and **firewall-friendly**.
- You can scale this pattern to host more internal apps (Grafana, ArgoCD, etc.) — just add new entries under `ingress:` in your Cloudflare config.

---

**Enjoy your secure, production-grade Hello World!** 🌎  
— Powered by *Talos Linux + Kubernetes + Cloudflare Tunnel*
