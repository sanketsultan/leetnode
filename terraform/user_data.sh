#!/bin/bash
# Bootstrap script — runs once on first EC2 boot via cloud-init.
# Installs all dependencies, clones the repo, builds and starts LeetNode.
set -euo pipefail
exec > /var/log/leetnode-bootstrap.log 2>&1

DOMAIN="${domain}"
REPO="${github_repo}"
APP_DIR="/opt/leetnode"
EMAIL="${alert_email}"

echo "[bootstrap] Starting at $(date)"

# ── System packages ──────────────────────────────────────────────────────────
apt-get update -q
apt-get install -y -q git curl nginx certbot python3-certbot-nginx

# ── Node.js 20 ───────────────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ── Docker ───────────────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# ── PM2 ──────────────────────────────────────────────────────────────────────
npm install -g pm2

# ── Clone repo ───────────────────────────────────────────────────────────────
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"
mkdir -p logs

# ── Build backend ────────────────────────────────────────────────────────────
cd "$APP_DIR/backend"
npm ci --prefer-offline
npm run build

# ── Build frontend ───────────────────────────────────────────────────────────
cd "$APP_DIR/frontend"
npm ci --prefer-offline
npm run build

# ── Build Docker problem images ───────────────────────────────────────────────
cd "$APP_DIR"
if [ -f docker/base/Dockerfile ]; then
  docker build -t leetnode-base:latest ./docker/base/
fi
for dir in docker/problems/*/; do
  name=$(basename "$dir")
  docker build -t "leetnode-problem-$name:latest" "$dir" || true
done

# ── nginx ────────────────────────────────────────────────────────────────────
cp "$APP_DIR/nginx/leetnode.conf" /etc/nginx/sites-available/leetnode
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/leetnode
ln -sf /etc/nginx/sites-available/leetnode /etc/nginx/sites-enabled/leetnode
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── SSL cert ─────────────────────────────────────────────────────────────────
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || \
  echo "[bootstrap] certbot failed — DNS may not have propagated yet. Run manually."

# ── Update ecosystem.config.js with real domain ───────────────────────────────
sed -i "s/yourdomain.com/$DOMAIN/g" "$APP_DIR/ecosystem.config.js"

# ── Start with PM2 ───────────────────────────────────────────────────────────
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "[bootstrap] Done at $(date). Site: https://$DOMAIN"
