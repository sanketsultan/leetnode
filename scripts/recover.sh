#!/bin/bash
# Full disaster recovery — run on any fresh Ubuntu 24.04 server.
# Usage:
#   sudo DOMAIN=leetnode.io DOCKERHUB_USERNAME=myuser GITHUB_PAT=ghp_xxx \
#     bash scripts/recover.sh
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN=leetnode.io}"
DH_USER="${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME}"
GITHUB_PAT="${GITHUB_PAT:-}"
REPO_HTTPS="${REPO:-https://github.com/sanketsultan/leetnode.git}"
APP_DIR="/opt/leetnode"

[ "$(id -u)" -ne 0 ] && { echo "Run as root or with sudo"; exit 1; }

log() { echo "[recover] $*"; }

[ -n "$GITHUB_PAT" ] && \
  CLONE_URL=$(echo "$REPO_HTTPS" | sed "s|https://|https://$GITHUB_PAT@|") || \
  CLONE_URL="$REPO_HTTPS"

log "Starting — $(date) | Domain: $DOMAIN | DockerHub: $DH_USER"

# ── Docker ───────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker && systemctl start docker
usermod -aG docker ubuntu

# ── Clone / update repo ──────────────────────────────────────────────────────
mkdir -p "$APP_DIR" && chown ubuntu:ubuntu "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  log "Updating repo"
  sudo -u ubuntu git -C "$APP_DIR" fetch origin
  sudo -u ubuntu git -C "$APP_DIR" reset --hard origin/master
else
  log "Cloning repo"
  sudo -u ubuntu git clone "$CLONE_URL" "$APP_DIR"
fi

# ── Write .env ───────────────────────────────────────────────────────────────
cat > "$APP_DIR/.env" <<EOF
DOCKERHUB_USERNAME=$DH_USER
DOMAIN=$DOMAIN
EOF
chown ubuntu:ubuntu "$APP_DIR/.env"
log "Wrote .env"

# ── Pull images ──────────────────────────────────────────────────────────────
log "Pulling Docker images from Docker Hub"
docker pull "$DH_USER/leetnode-backend:latest"  || true
docker pull "$DH_USER/leetnode-frontend:latest" || true
docker pull "$DH_USER/leetnode-base:latest" && \
  docker tag "$DH_USER/leetnode-base:latest" leetnode-base:latest || true
for dir in "$APP_DIR"/docker/problems/*/; do
  name=$(basename "$dir")
  src="$DH_USER/leetnode-problem-$name:latest"
  docker pull "$src" && docker tag "$src" "leetnode-problem-$name:latest" || true
done

# Build any that didn't pull
docker image inspect leetnode-base:latest &>/dev/null || \
  docker build -t leetnode-base:latest "$APP_DIR/docker/base/"
for dir in "$APP_DIR"/docker/problems/*/; do
  name=$(basename "$dir")
  docker image inspect "leetnode-problem-$name:latest" &>/dev/null || \
    docker build -t "leetnode-problem-$name:latest" "$dir" || true
done

# ── Start ────────────────────────────────────────────────────────────────────
cd "$APP_DIR"
sudo -u ubuntu docker compose up -d

# ── Systemd service for reboot ───────────────────────────────────────────────
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
systemctl daemon-reload && systemctl enable leetnode

log "Done — https://$DOMAIN"
log "Status: docker compose ps"
log "Logs:   docker compose logs -f"
