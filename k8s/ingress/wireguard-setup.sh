#!/bin/bash

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     Cluster WireGuard Failover Setup Script                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if wg command is available locally (optional but helpful)
if ! command -v wg &> /dev/null; then
    echo "⚠️  WireGuard tools not found locally. Will generate keys in container."
    USE_CONTAINER=1
else
    USE_CONTAINER=0
fi

echo "Step 1: Generating WireGuard keys..."
echo ""

if [ $USE_CONTAINER -eq 0 ]; then
    # Generate keys locally
    PRIVATE_KEY=$(wg genkey)
    PUBLIC_KEY=$(echo "$PRIVATE_KEY" | wg pubkey)
else
    # Generate keys in a temporary container
    echo "Using temporary container to generate keys..."
    PRIVATE_KEY=$(docker run --rm linuxserver/wireguard:latest wg genkey)
    PUBLIC_KEY=$(echo "$PRIVATE_KEY" | docker run --rm -i linuxserver/wireguard:latest wg pubkey)
fi

echo "✅ Keys generated successfully"
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  CLUSTER WIREGUARD PUBLIC KEY (Save this - update VPS config) ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo "$PUBLIC_KEY"
echo ""
echo "⚠️  IMPORTANT: Copy this public key and update your VPS configuration:"
echo "   1. SSH into VPS: ssh root@165.227.110.199"
echo "   2. Edit: /etc/wireguard/wg0.conf"
echo "   3. Uncomment [Peer] section and add:"
echo "      PublicKey = $PUBLIC_KEY"
echo "      AllowedIPs = 10.100.0.2/32"
echo "      PersistentKeepalive = 25"
echo "   4. Restart WireGuard: wg-quick down wg0 && wg-quick up wg0"
echo ""
read -p "Press Enter once you've updated the VPS configuration..."
echo ""

echo "Step 2: Creating ingress namespace (if not exists)..."
kubectl create namespace ingress --dry-run=client -o yaml | kubectl apply -f -
echo "✅ Namespace ready"
echo ""

echo "Step 3: Creating WireGuard secret with keys..."
kubectl create secret generic wireguard-keys \
    --from-literal=privatekey="$PRIVATE_KEY" \
    --from-literal=publickey="$PUBLIC_KEY" \
    --namespace=ingress \
    --dry-run=client -o yaml | kubectl apply -f -
echo "✅ Secret created"
echo ""

echo "Step 4: Updating WireGuard ConfigMap with private key..."
# Create temp file with updated config
TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" << WGCONF
[Interface]
Address = 10.100.0.2/24
ListenPort = 51820
PrivateKey = $PRIVATE_KEY

# PostUp/PostDown for iptables rules
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# VPS peer configuration
[Peer]
# VPS WireGuard public key
PublicKey = 3JeBp1O1lXpfOwgSiXES0kGDdsp+qWtg+psL5+ehPiU=

# VPS endpoint (IP:Port)
Endpoint = 165.227.110.199:51820

# Allow traffic from VPS WireGuard IP
AllowedIPs = 10.100.0.1/32

# Keep connection alive (traverse NAT)
PersistentKeepalive = 25
WGCONF

kubectl create configmap wireguard-config \
    --from-file=wg0.conf="$TEMP_CONFIG" \
    --namespace=ingress \
    --dry-run=client -o yaml | kubectl apply -f -

rm -f "$TEMP_CONFIG"
echo "✅ ConfigMap updated"
echo ""

echo "Step 5: Deploying WireGuard pod..."
kubectl apply -f /Users/john/homelab/app-development/mirai-prototype/k8s/ingress/wireguard-deployment.yaml
echo "✅ Deployment applied"
echo ""

echo "Step 6: Waiting for WireGuard pod to be ready..."
kubectl wait --for=condition=ready pod \
    -l app=wireguard-failover \
    -n ingress \
    --timeout=120s || {
    echo "⚠️  Pod not ready yet. Checking status..."
    kubectl get pods -n ingress -l app=wireguard-failover
    kubectl describe pod -n ingress -l app=wireguard-failover
}
echo ""

echo "Step 7: Verifying WireGuard tunnel..."
WIREGUARD_POD=$(kubectl get pods -n ingress -l app=wireguard-failover -o jsonpath='{.items[0].metadata.name}')

if [ -n "$WIREGUARD_POD" ]; then
    echo "WireGuard pod: $WIREGUARD_POD"
    echo ""

    echo "Testing WireGuard interface status..."
    kubectl exec -n ingress "$WIREGUARD_POD" -c wireguard -- wg show || true
    echo ""

    echo "Testing ping to VPS (10.100.0.1)..."
    if kubectl exec -n ingress "$WIREGUARD_POD" -c wireguard -- ping -c 3 10.100.0.1; then
        echo "✅ Tunnel is working! Can reach VPS."
    else
        echo "❌ Cannot ping VPS. Troubleshooting needed."
    fi
    echo ""

    echo "Testing nginx proxy health..."
    kubectl exec -n ingress "$WIREGUARD_POD" -c reverse-proxy -- wget -q -O- http://localhost/health || true
    echo ""
else
    echo "❌ WireGuard pod not found"
fi

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                     SETUP COMPLETE                               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Cluster WireGuard Public Key: $PUBLIC_KEY"
echo ""
echo "Next Steps:"
echo "1. ✅ Cluster WireGuard deployed"
echo "2. ⚠️  Update VPS /etc/wireguard/wg0.conf with cluster public key (see above)"
echo "3. Test end-to-end: curl http://165.227.110.199/"
echo "4. Configure DNS failover in Cloudflare"
echo "5. Install Let's Encrypt SSL on VPS"
echo ""
echo "Monitoring commands:"
echo "  kubectl logs -n ingress -l app=wireguard-failover -c wireguard --tail=50"
echo "  kubectl logs -n ingress -l app=wireguard-failover -c reverse-proxy --tail=50"
echo "  kubectl exec -n ingress $WIREGUARD_POD -c wireguard -- wg show"
echo ""
