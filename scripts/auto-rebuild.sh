#!/usr/bin/env bash
# auto-rebuild.sh
# Called by the Claude Code PostToolUse hook after every Write/Edit.
# Reads the changed file path from stdin (hook JSON), figures out which
# service or image is affected, and rebuilds + restarts only that piece.
#
# Usage: echo '<hook-json>' | bash scripts/auto-rebuild.sh

set -euo pipefail

FILE=$(jq -r '.tool_input.file_path // ""')
[ -z "$FILE" ] && exit 0

D=/Users/sanket/Desktop/leetnode
cd "$D"

COMPOSE="docker compose -f docker-compose.dev.yml"

echo "[auto-rebuild] changed: $FILE"

# ── Frontend source ────────────────────────────────────────────────────────
# Rebuild frontend image and restart the container.
# npm run build runs first as a fast type/lint gate (Docker also builds
# internally, but catching errors locally is faster feedback).
if echo "$FILE" | grep -qE '/frontend/.*\.(tsx?|jsx?|css|mjs)$'; then
  echo "[auto-rebuild] frontend source -> npm build + docker rebuild"
  cd "$D/frontend" && npm run build 2>&1 | tail -20
  cd "$D"
  $COMPOSE up --build -d frontend 2>&1 | tail -8
  echo "[auto-rebuild] frontend container restarted"

# ── Backend source ─────────────────────────────────────────────────────────
elif echo "$FILE" | grep -qE '/backend/src/.*\.(ts|js)$'; then
  echo "[auto-rebuild] backend source -> docker rebuild"
  $COMPOSE up --build -d backend 2>&1 | tail -8
  echo "[auto-rebuild] backend container restarted"

# ── Problem docker files (setup.sh / verify.sh / Dockerfile) ─────────────
# Rebuild only the affected problem image. Backend picks it up automatically
# for the next session (images are referenced by name, not pinned IDs).
elif echo "$FILE" | grep -qE '/docker/problems/[^/]+/'; then
  SLUG=$(echo "$FILE" | sed 's|.*/docker/problems/\([^/]*\)/.*|\1|')
  echo "[auto-rebuild] problem file ($SLUG) -> rebuilding image"
  docker build \
    -t "leetnode-problem-${SLUG}:latest" \
    "$D/docker/problems/${SLUG}/" \
    2>&1 | tail -15
  echo "[auto-rebuild] leetnode-problem-${SLUG}:latest rebuilt"

# ── Base image ────────────────────────────────────────────────────────────
# Rebuilding base does NOT cascade to problem images automatically.
# Run /build to rebuild all problem images after a base change.
elif echo "$FILE" | grep -qE '/docker/base/'; then
  echo "[auto-rebuild] base image changed -> rebuilding leetnode-base"
  docker build -t leetnode-base:latest "$D/docker/base/" 2>&1 | tail -15
  echo "[auto-rebuild] base rebuilt. Run /build to cascade to problem images."

# ── docker-compose files ───────────────────────────────────────────────────
elif echo "$FILE" | grep -qE 'docker-compose.*\.yml$'; then
  echo "[auto-rebuild] compose file changed -> restarting all services"
  $COMPOSE up -d 2>&1 | tail -10
  echo "[auto-rebuild] all services restarted"

# ── nginx config ───────────────────────────────────────────────────────────
elif echo "$FILE" | grep -qE '/nginx/'; then
  echo "[auto-rebuild] nginx config changed -> reloading nginx"
  $COMPOSE restart nginx 2>&1 | tail -5
  echo "[auto-rebuild] nginx restarted"

# ── Problem JSON metadata ──────────────────────────────────────────────────
# Files are bind-mounted into backend container, so a restart picks them up.
elif echo "$FILE" | grep -qE '/problems/.*\.json$'; then
  echo "[auto-rebuild] problem JSON changed -> restarting backend"
  $COMPOSE restart backend 2>&1 | tail -5
  echo "[auto-rebuild] backend restarted"

else
  echo "[auto-rebuild] no rebuild rule matched for $FILE, skipping"
fi
