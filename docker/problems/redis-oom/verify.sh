#!/bin/bash
# verify.sh — redis-oom
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

CONFIG=/etc/redis/redis.conf

# ── Step 1: Static check — is maxmemory at a sane value? ────────────────────
MAXMEM_LINE=$(grep -E '^maxmemory\s' "$CONFIG" 2>/dev/null | awk '{print $2}' | head -1)

if [ -z "$MAXMEM_LINE" ]; then
  echo '{"success": false, "message": "maxmemory is not set in /etc/redis/redis.conf. Add: maxmemory 256mb"}'
  exit 1
fi

# Parse into bytes (accept 0 = unlimited, or >= 64mb)
VAL=$(echo "$MAXMEM_LINE" | tr '[:upper:]' '[:lower:]')
if [ "$VAL" = "0" ]; then
  BYTES=999999999
elif echo "$VAL" | grep -qE '^[0-9]+gb$'; then
  BYTES=$(( ${VAL%gb} * 1073741824 ))
elif echo "$VAL" | grep -qE '^[0-9]+mb$'; then
  BYTES=$(( ${VAL%mb} * 1048576 ))
elif echo "$VAL" | grep -qE '^[0-9]+kb$'; then
  BYTES=$(( ${VAL%kb} * 1024 ))
elif echo "$VAL" | grep -qE '^[0-9]+$'; then
  BYTES="$VAL"
else
  echo "{\"success\": false, \"message\": \"Could not parse maxmemory value: ${MAXMEM_LINE}. Use a value like 256mb or 0 (unlimited).\"}"
  exit 1
fi

MIN_BYTES=$(( 64 * 1048576 ))  # 64 MB minimum

if [ "$BYTES" -lt "$MIN_BYTES" ] 2>/dev/null; then
  echo "{\"success\": false, \"message\": \"maxmemory is still too low (${MAXMEM_LINE}). Set it to at least 64mb in /etc/redis/redis.conf, then restart redis.\"}"
  exit 1
fi

# ── Step 2: Ensure redis is running with the new config ─────────────────────
# Try a live config set first (no restart needed), then fall back to restart
redis-cli config set maxmemory "$MAXMEM_LINE" 2>/dev/null || true
if ! redis-cli ping 2>/dev/null | grep -q PONG; then
  service redis-server restart 2>/dev/null || redis-server "$CONFIG" --daemonize yes 2>/dev/null || true
  sleep 1
fi

# ── Step 3: Functional write + read test ────────────────────────────────────
PING=$(redis-cli ping 2>/dev/null)
if [ "$PING" != "PONG" ]; then
  echo '{"success": false, "message": "Redis is not responding after restart. Run: service redis-server restart"}'
  exit 1
fi

SET_RESULT=$(redis-cli set leetnode_verify "ok_$(date +%s)" 2>/dev/null)
if [ "$SET_RESULT" != "OK" ]; then
  echo "{\"success\": false, \"message\": \"Redis still rejecting writes (${SET_RESULT:-timeout}). Check maxmemory in the config and restart redis.\"}"
  exit 1
fi

GET_RESULT=$(redis-cli get leetnode_verify 2>/dev/null)
if [[ "$GET_RESULT" != ok_* ]]; then
  echo '{"success": false, "message": "Redis accepted the write but read-back failed. Something is wrong with the instance."}'
  exit 1
fi

echo "{\"success\": true, \"message\": \"Redis maxmemory set to ${MAXMEM_LINE}. Writes and reads working correctly.\"}"
exit 0
