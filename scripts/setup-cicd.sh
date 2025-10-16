#!/bin/bash

echo "🚀 Mirai CI/CD Setup Script"
echo ""

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username is required"
    exit 1
fi

echo ""
echo "📝 Updating configuration files..."

# Update deployment.yaml
sed -i.bak "s|ghcr.io/GITHUB_USERNAME|ghcr.io/${GITHUB_USERNAME}|g" k8s/frontend/deployment.yaml
echo "✅ Updated k8s/frontend/deployment.yaml"

# Update ArgoCD application
sed -i.bak "s|GITHUB_USERNAME|${GITHUB_USERNAME}|g" k8s/argocd-frontend-app.yaml
echo "✅ Updated k8s/argocd-frontend-app.yaml"

# Clean up backup files
rm -f k8s/frontend/deployment.yaml.bak
rm -f k8s/argocd-frontend-app.yaml.bak

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Commit and push your changes:"
echo "   git add ."
echo "   git commit -m 'Add frontend CI/CD pipeline'"
echo "   git push origin main"
echo ""
echo "2. GitHub Actions will automatically build and push the Docker image"
echo ""
echo "3. Deploy ArgoCD Application:"
echo "   kubectl apply -f k8s/argocd-frontend-app.yaml"
echo ""
echo "4. Update Cloudflare Tunnel to route to mirai-frontend service"
echo ""
echo "5. Monitor deployment:"
echo "   kubectl get pods -l app=mirai-frontend -w"
echo "   argocd app get mirai-frontend"
echo ""
