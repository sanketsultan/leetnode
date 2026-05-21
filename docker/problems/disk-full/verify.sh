#!/bin/bash
# verify.sh — disk-full
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

LOGDIR=/var/log/app
LIMIT_MB=200

# ── Step 1: Check the app.log (active log) is still present ───────────────────
if [ ! -f "$LOGDIR/app.log" ]; then
  echo '{"success": false, "message": "The active log file (app.log) was deleted. Only delete the old compressed archives (*.gz), not the current log."}'
  exit 1
fi

# ── Step 2: Check disk usage is now under the limit ───────────────────────────
SIZE_MB=$(du -sm "$LOGDIR" 2>/dev/null | awk '{print $1}')

if [ "$SIZE_MB" -gt "$LIMIT_MB" ]; then
  echo "{\"success\": false, \"message\": \"Log directory is still ${SIZE_MB}MB (limit: ${LIMIT_MB}MB). Remove more of the old .gz archives.\"}"
  exit 1
fi

# ── Step 3: Confirm start_server.sh succeeds ──────────────────────────────────
if /home/user/start_server.sh >/dev/null 2>&1; then
  echo "{\"success\": true, \"message\": \"Disk cleared to ${SIZE_MB}MB. Server started successfully!\"}"
else
  echo "{\"success\": false, \"message\": \"Disk usage is ${SIZE_MB}MB but start_server.sh still fails. Something else is wrong.\"}"
  exit 1
fi
exit 0
