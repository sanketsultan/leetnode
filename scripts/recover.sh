#!/bin/bash
# recover.sh — full disaster recovery on any fresh Ubuntu 24.04 server.
# Installs everything, pulls Docker images from Hub, starts LeetNode.
#
# Usage (run as root or with sudo):
#   DOMAIN=leetnode.io \
#   DOCKERHUB_USERNAME=myuser \
#   GITHUB_PAT=ghp_xxxx \
#   bash <(curl -fsSL https://raw.githubusercontent.com/sanketsultan/leetnode/main/scripts/recover.sh)
#
# Or clone first, then:
#   sudo DOMAIN=leetnode.io DOCKERHUB_USERNAME=myuser bash scripts/recover.sh

set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN=leetnode.io}"
DH_USER="${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME=yourdockerhubuser}"
GITHUB_PAT="${GITHUB_PAT:-}"
REPO_HTTPS="${REPO:-https://github.com/sanketsultan/leetnode.git}"
APP_DIR="/opt/leetnode"
EMAIL="${ALERT_EMAIL:-admin@$DOMAIN}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root or with sudo" >&2; exit 1
fi

log() { echo "[recover] $*"; }

log "Starting recovery — $(date)"
log "Domain: $DOMAIN | DockerHub: $DH_USER"

# ── 1. System packages ───────────────────────────────────────────────────────
log "[1/8] Installing system packages"
apt-get update -q
apt-get install -y -q \
  git curl nginx certbot python3-certbot-nginx \
  build-essential python3-dev

# ── 2. Node.js 20 ────────────────────────────────────────────────────────────
log "[2/8] Installing Node.js 20"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

# ── 3. Docker ────────────────────────────────────────────────────────────────
log "[3/8] Installing Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker && systemctl start docker
usermod -aG docker ubuntu

# ── 4. PM2 ───────────────────────────────────────────────────────────────────
log "[4/8] Installing PM2"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# ── 5. Clone / update repo ───────────────────────────────────────────────────
log "[5/8] Cloning repo"
if [ -n "$GITHUB_PAT" ]; then
  CLONE_URL=$(echo "$REPO_HTTPS" | sed "s|https://|https://$GITHUB_PAT@|")
else
  CLONE_URL="$REPO_HTTPS"
fi

mkdir -p "$APP_DIR"
chown ubuntu:ubuntu "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  log "  Repo exists — resetting to latest main"
  sudo -u ubuntu git -C "$APP_DIR" fetch origin main
  sudo -u ubuntu git -C "$APP_DIR" reset --hard origin/main
else
  log "  Fresh clone"
  sudo -u ubuntu git clone "$CLONE_URL" "$APP_DIR"
fi
sudo -u ubuntu mkdir -p "$APP_DIR/logs"

# ── 6. Docker images ─────────────────────────────────────────────────────────
log "[6/8] Pulling Docker images from Docker Hub"

pull_and_tag() {
  local src="$1" dst="$2"
  if docker pull "$src" 2>/dev/null; then
    docker tag "$src" "$dst"
    log "  Pulled $dst"
  else
    log "  Pull failed for $src — will build locally"
    false
  fi
}

pull_and_tag "$DH_USER/leetnode-base:latest" "leetnode-base:latest" || \
  docker build -t leetnode-base:latest "$APP_DIR/docker/base/"

for dir in "$APP_DIR"/docker/problems/*/; do
  name=$(basename "$dir")
  pull_and_tag "$DH_USER/leetnode-problem-$name:latest" "leetnode-problem-$name:latest" || \
    docker build -t "leetnode-problem-$name:latest" "$dir" || true
done

# ── 7. Build app ─────────────────────────────────────────────────────────────
log "[7/8] Building backend + frontend"

cd "$APP_DIR/backend"
sudo -u ubuntu npm ci --prefer-offline
sudo -u ubuntu npm run build

cd "$APP_DIR/frontend"
sudo -u ubuntu npm ci --prefer-offline
sudo -u ubuntu npm run build

# ── 8. nginx + SSL + PM2 ─────────────────────────────────────────────────────
log "[8/8] Configuring nginx, SSL, PM2"

cp "$APP_DIR/nginx/leetnode.conf" /etc/nginx/sites-available/leetnode
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/leetnode
ln -sf /etc/nginx/sites-available/leetnode /etc/nginx/sites-enabled/leetnode
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || \
  log "  certbot failed — run: sudo certbot --nginx -d $DOMAIN"

sed -i "s/yourdomain.com/$DOMAIN/g" "$APP_DIR/ecosystem.config.js"
cd "$APP_DIR"
sudo -u ubuntu pm2 delete all 2>/dev/null || true
sudo -u ubuntu pm2 start ecosystem.config.js
sudo -u ubuntu pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash

log ""
log "Recovery complete! $(date)"
log "Site:   https://$DOMAIN"
log "Status: sudo -u ubuntu pm2 status"
log "Logs:   sudo -u ubuntu pm2 logs"
