#!/bin/bash
# Bootstrap script — runs once on first EC2 boot via cloud-init.
# Full disaster recovery: run on any fresh Ubuntu 24.04 server and LeetNode
# will be up within ~5 minutes. All images come from Docker Hub (pre-built by CI).
set -euo pipefail
exec > /var/log/leetnode-bootstrap.log 2>&1

DOMAIN="${domain}"
GITHUB_PAT="${github_pat}"
REPO_HTTPS="${github_repo}"   # e.g. https://github.com/sanketsultan/leetnode.git
DH_USER="${dockerhub_username}"
APP_DIR="/opt/leetnode"
EMAIL="${alert_email}"

# Build authenticated clone URL if PAT supplied
if [ -n "$GITHUB_PAT" ]; then
  # Insert token: https://TOKEN@github.com/...
  CLONE_URL=$(echo "$REPO_HTTPS" | sed "s|https://|https://$GITHUB_PAT@|")
else
  CLONE_URL="$REPO_HTTPS"
fi

echo "[bootstrap] Starting at $(date)"
echo "[bootstrap] Domain: $DOMAIN | Repo: $REPO_HTTPS | DockerHub: $DH_USER"

# ── System packages ──────────────────────────────────────────────────────────
apt-get update -q
apt-get install -y -q \
  git curl nginx certbot python3-certbot-nginx \
  build-essential python3-dev

# ── Node.js 20 ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ── Docker ───────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# ── PM2 ──────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# ── Clone repo ───────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown ubuntu:ubuntu "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "[bootstrap] Repo exists — pulling latest"
  sudo -u ubuntu git -C "$APP_DIR" pull
else
  echo "[bootstrap] Cloning repo"
  sudo -u ubuntu git clone "$CLONE_URL" "$APP_DIR"
fi

cd "$APP_DIR"
sudo -u ubuntu mkdir -p logs

# ── Pull Docker images from Docker Hub (built by CI) ────────────────────────
if [ -n "$DH_USER" ]; then
  echo "[bootstrap] Pulling Docker images from Docker Hub ($DH_USER)"

  docker pull "$DH_USER/leetnode-base:latest" 2>/dev/null && \
    docker tag "$DH_USER/leetnode-base:latest" leetnode-base:latest || \
    echo "[bootstrap] Warning: base image pull failed, will build locally"

  for dir in "$APP_DIR"/docker/problems/*/; do
    name=$(basename "$dir")
    src="$DH_USER/leetnode-problem-$name:latest"
    dst="leetnode-problem-$name:latest"
    docker pull "$src" && docker tag "$src" "$dst" || \
      echo "[bootstrap] Warning: $name pull failed, will build locally"
  done
else
  echo "[bootstrap] No DockerHub username — building images locally (slower)"
fi

# ── Build any images that didn't pull successfully ───────────────────────────
if ! docker image inspect leetnode-base:latest &>/dev/null; then
  echo "[bootstrap] Building base image locally"
  docker build -t leetnode-base:latest "$APP_DIR/docker/base/"
fi
for dir in "$APP_DIR"/docker/problems/*/; do
  name=$(basename "$dir")
  if ! docker image inspect "leetnode-problem-$name:latest" &>/dev/null; then
    echo "[bootstrap] Building $name locally"
    docker build -t "leetnode-problem-$name:latest" "$dir" || true
  fi
done

# ── Build backend ────────────────────────────────────────────────────────────
echo "[bootstrap] Building backend"
cd "$APP_DIR/backend"
sudo -u ubuntu npm ci --prefer-offline
sudo -u ubuntu npm run build

# ── Build frontend ───────────────────────────────────────────────────────────
echo "[bootstrap] Building frontend"
cd "$APP_DIR/frontend"
sudo -u ubuntu npm ci --prefer-offline
sudo -u ubuntu npm run build

# ── nginx ────────────────────────────────────────────────────────────────────
echo "[bootstrap] Configuring nginx"
cp "$APP_DIR/nginx/leetnode.conf" /etc/nginx/sites-available/leetnode
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/leetnode
ln -sf /etc/nginx/sites-available/leetnode /etc/nginx/sites-enabled/leetnode
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── SSL cert ─────────────────────────────────────────────────────────────────
echo "[bootstrap] Requesting SSL certificate"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || \
  echo "[bootstrap] certbot failed — DNS may not have propagated yet. Run: sudo certbot --nginx -d $DOMAIN"

# ── PM2 ──────────────────────────────────────────────────────────────────────
echo "[bootstrap] Starting services with PM2"
sed -i "s/yourdomain.com/$DOMAIN/g" "$APP_DIR/ecosystem.config.js"
cd "$APP_DIR"
sudo -u ubuntu pm2 delete all 2>/dev/null || true
sudo -u ubuntu pm2 start ecosystem.config.js
sudo -u ubuntu pm2 save

# Enable PM2 on reboot for ubuntu user
env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash

echo "[bootstrap] Done at $(date)"
echo "[bootstrap] Site: https://$DOMAIN"
echo "[bootstrap] Check logs: pm2 logs (as ubuntu user)"
echo "[bootstrap] Full bootstrap log: /var/log/leetnode-bootstrap.log"
