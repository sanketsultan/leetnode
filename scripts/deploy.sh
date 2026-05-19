#!/bin/bash
# deploy.sh — run on the VPS to install or update LeetNode
# Works for both fresh installs and updates.
# Usage:
#   DOMAIN=leetnode.io DOCKERHUB_USERNAME=myuser bash scripts/deploy.sh
set -e

DOMAIN="${DOMAIN:-yourdomain.com}"
REPO="${REPO:-git@github.com:sanketsultan/leetnode.git}"
APP_DIR="/opt/leetnode"
DEPLOY_KEY="${DEPLOY_KEY:-/home/ubuntu/.ssh/leetnode_deploy}"
DH_USER="${DOCKERHUB_USERNAME:-}"
export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no"

echo "==> [1/8] Installing system dependencies"
apt-get update -q
apt-get install -y -q \
  git nginx certbot python3-certbot-nginx curl \
  build-essential python3-dev

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
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
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

echo "==> [5/8] Pulling / building Docker images"
if [ -n "$DH_USER" ]; then
  echo "   Pulling from Docker Hub ($DH_USER)"

  docker pull "$DH_USER/leetnode-base:latest" 2>/dev/null && \
    docker tag "$DH_USER/leetnode-base:latest" leetnode-base:latest || true

  for dir in docker/problems/*/; do
    name=$(basename "$dir")
    src="$DH_USER/leetnode-problem-$name:latest"
    dst="leetnode-problem-$name:latest"
    docker pull "$src" && docker tag "$src" "$dst" || true
  done
fi

# Build any image that didn't pull
if ! docker image inspect leetnode-base:latest &>/dev/null; then
  docker build -t leetnode-base:latest docker/base/
fi
for dir in docker/problems/*/; do
  name=$(basename "$dir")
  if ! docker image inspect "leetnode-problem-$name:latest" &>/dev/null; then
    echo "   Building $name locally"
    docker build -t "leetnode-problem-$name:latest" "$dir" || true
  fi
done

echo "==> [6/8] Configuring nginx"
cp nginx/leetnode.conf /etc/nginx/sites-available/leetnode
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/leetnode
ln -sf /etc/nginx/sites-available/leetnode /etc/nginx/sites-enabled/leetnode
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> [7/8] SSL certificate (certbot)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
  echo "  Skipping — run manually: sudo certbot --nginx -d $DOMAIN"

echo "==> [8/8] Starting with PM2"
sed -i "s/yourdomain.com/$DOMAIN/g" ecosystem.config.js
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true

echo ""
echo "Done! LeetNode is running at https://$DOMAIN"
echo "Logs: pm2 logs | Status: pm2 status"
