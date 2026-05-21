#!/bin/bash
set -e

# ── Create log directory ───────────────────────────────────────────────────────
mkdir -p /var/log/app

# ── Generate fake compressed log archives (total ~700MB) ──────────────────────
# Simulate 7 months of logs that were never cleaned up
for i in 01 02 03 04 05 06 07; do
  dd if=/dev/urandom bs=1M count=100 2>/dev/null | gzip -1 > /var/log/app/app-2024-${i}.log.gz
done

# Current month's active log (should NOT be deleted)
echo "$(date) INFO Server started" > /var/log/app/app.log
echo "$(date) INFO All systems nominal" >> /var/log/app/app.log

# ── Server startup script that checks disk usage ───────────────────────────────
cat > /home/user/start_server.sh << 'EOF'
#!/bin/bash
# Simulate a server that refuses to start if /var/log/app is over 200MB

LOGDIR=/var/log/app
SIZE_MB=$(du -sm "$LOGDIR" 2>/dev/null | awk '{print $1}')
LIMIT_MB=200

if [ "$SIZE_MB" -gt "$LIMIT_MB" ]; then
  echo "ERROR: Log directory is using ${SIZE_MB}MB (limit: ${LIMIT_MB}MB)"
  echo "       Please clean up old log archives before restarting."
  echo "       Old archives are in: $LOGDIR"
  exit 1
fi

echo "✓ Disk check passed (${SIZE_MB}MB used, limit ${LIMIT_MB}MB)"
echo "✓ Server started successfully"
echo "  Ready to accept connections on :8080"
EOF
chmod +x /home/user/start_server.sh

# ── README ─────────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║             SERVER WON'T START: DISK FULL               ║
╚══════════════════════════════════════════════════════════╝

The server is down. Start script refuses to run because
/var/log/app has too much data (log rotation was broken).

Try starting the server:
  /home/user/start_server.sh

Investigate disk usage:
  du -sh /var/log/app/*
  ls -lhS /var/log/app/

The active log (app.log) must NOT be deleted.
Only clean up old compressed archives (*.gz files).

Once cleaned up, verify:
  /home/user/start_server.sh
EOF

# ── .bashrc banner ────────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "  PROBLEM: Server Won't Start: Disk Full"
echo "  Read README.txt to get started."
echo "  Run: /home/user/start_server.sh"
echo ""
EOF

chown -R user:user /home/user
