#!/bin/bash
# deploy.sh — run on the VPS to install or update LeetNode
# Usage: bash scripts/deploy.sh
set -e

DOMAIN="${DOMAIN:-yourdomain.com}"
REPO="${REPO:-git@github.com:sanketsultan/leetnode.git}"
APP_DIR="/opt/leetnode"
DEPLOY_KEY="${DEPLOY_KEY:-/home/ubuntu/.ssh/leetnode_deploy}"
export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no"

echo "==> [1/8] Installing system dependencies"
apt-get update -q
apt-get install -y -q git nginx certbot python3-certbot-nginx curl

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Docker
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

echo "==> [2/8] Cloning / updating repo"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO" "$APP_DIR"
fi
chown -R ubuntu:ubuntu "$APP_DIR"
cd "$APP_DIR"
mkdir -p logs

echo "==> [3/8] Building backend"
cd backend
npm ci --prefer-offline
npm run build
cd ..

echo "==> [4/8] Building frontend"
cd frontend
npm ci --prefer-offline
npm run build
cd ..

echo "==> [5/8] Pre-pulling problem Docker images"
# Pull images so the first session doesn't have to wait for a download
for dir in docker/problems/*/; do
  image=$(basename "$dir")
  full="leetnode-problem-${image}:latest"
  echo "   Pulling $full ..."
  docker pull "$full" 2>/dev/null || docker build -t "$full" "$dir" || true
done
docker pull leetnode-base:latest 2>/dev/null || true

echo "==> [6/8] Configuring nginx"
cp nginx/leetnode.conf /etc/nginx/sites-available/leetnode
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/leetnode
ln -sf /etc/nginx/sites-available/leetnode /etc/nginx/sites-enabled/leetnode
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> [7/8] SSL certificate (certbot)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
  echo "  Skipping — certbot failed (run manually: certbot --nginx -d $DOMAIN)"

echo "==> [8/8] Starting with PM2"
# Update domain in ecosystem config
sed -i "s/yourdomain.com/$DOMAIN/g" ecosystem.config.js

pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "Done! LeetNode is running at https://$DOMAIN"
echo "Logs: pm2 logs"
echo "Status: pm2 status"
