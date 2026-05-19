#!/bin/bash
# Bootstrap — runs once on first EC2 boot via cloud-init.
# Full disaster recovery: run on any fresh Ubuntu 24.04 server.
set -euo pipefail
exec > /var/log/leetnode-bootstrap.log 2>&1

DOMAIN="${domain}"
GITHUB_PAT="${github_pat}"
REPO_HTTPS="${github_repo}"
DH_USER="${dockerhub_username}"
APP_DIR="/opt/leetnode"
EMAIL="${alert_email}"

[ -n "$GITHUB_PAT" ] && \
  CLONE_URL=$(echo "$REPO_HTTPS" | sed "s|https://|https://$GITHUB_PAT@|") || \
  CLONE_URL="$REPO_HTTPS"

echo "[bootstrap] Starting at $(date) | Domain: $DOMAIN | DockerHub: $DH_USER"

# ── System packages ──────────────────────────────────────────────────────────
apt-get update -q
apt-get install -y -q git curl

# ── Docker (includes Docker Compose v2) ──────────────────────────────────────
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# ── Clone repo ───────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown ubuntu:ubuntu "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  sudo -u ubuntu git -C "$APP_DIR" fetch origin
  sudo -u ubuntu git -C "$APP_DIR" reset --hard origin/master
else
  sudo -u ubuntu git clone "$CLONE_URL" "$APP_DIR"
fi

# ── Write .env for docker compose ────────────────────────────────────────────
cat > "$APP_DIR/.env" <<EOF
DOCKERHUB_USERNAME=$DH_USER
DOMAIN=$DOMAIN
EOF
chown ubuntu:ubuntu "$APP_DIR/.env"

# ── Pull app images from Docker Hub ──────────────────────────────────────────
if [ -n "$DH_USER" ]; then
  docker pull "$DH_USER/leetnode-backend:latest"  || true
  docker pull "$DH_USER/leetnode-frontend:latest" || true
  docker pull "$DH_USER/leetnode-base:latest" && \
    docker tag "$DH_USER/leetnode-base:latest" leetnode-base:latest || true
  for dir in "$APP_DIR"/docker/problems/*/; do
    name=$(basename "$dir")
    src="$DH_USER/leetnode-problem-$name:latest"
    docker pull "$src" && docker tag "$src" "leetnode-problem-$name:latest" || true
  done
fi

# ── Build any images that didn't pull ────────────────────────────────────────
if ! docker image inspect leetnode-base:latest &>/dev/null; then
  docker build -t leetnode-base:latest "$APP_DIR/docker/base/"
fi
for dir in "$APP_DIR"/docker/problems/*/; do
  name=$(basename "$dir")
  docker image inspect "leetnode-problem-$name:latest" &>/dev/null || \
    docker build -t "leetnode-problem-$name:latest" "$dir" || true
done

# ── Start with Docker Compose ────────────────────────────────────────────────
cd "$APP_DIR"
sudo -u ubuntu docker compose up -d

# ── Auto-start on reboot ─────────────────────────────────────────────────────
cat > /etc/systemd/system/leetnode.service <<'EOF'
[Unit]
Description=LeetNode Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/leetnode
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable leetnode

echo "[bootstrap] Done at $(date) — https://$DOMAIN"
