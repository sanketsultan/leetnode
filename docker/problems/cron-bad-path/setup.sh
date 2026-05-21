#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq cron gzip

# ── The log rotation script (lives in /usr/local/bin) ───────────────────────
# Works perfectly when called directly. Fails silently from cron because
# cron's default PATH is /usr/bin:/bin — it doesn't include /usr/local/bin.
mkdir -p /usr/local/bin
cat > /usr/local/bin/rotate-logs.sh << 'SCRIPTEOF'
#!/bin/bash
# Rotates /var/log/app/app.log — compresses and archives it.
LOGDIR=/var/log/app
ARCHIVE=$LOGDIR/archive

mkdir -p "$ARCHIVE"

if [ ! -f "$LOGDIR/app.log" ]; then
  echo "$(date): ERROR — app.log not found" >> /var/log/rotate-status.log
  exit 1
fi

SIZE=$(stat -c%s "$LOGDIR/app.log" 2>/dev/null)
DATESTAMP=$(date +%Y%m%d-%H%M%S)
gzip -c "$LOGDIR/app.log" > "$ARCHIVE/app-${DATESTAMP}.log.gz"
truncate -s 0 "$LOGDIR/app.log"
echo "$(date): SUCCESS — rotated ${SIZE} bytes -> archive/app-${DATESTAMP}.log.gz" >> /var/log/rotate-status.log
echo "$(date): SUCCESS — rotated app.log"
SCRIPTEOF
chmod +x /usr/local/bin/rotate-logs.sh

# ── Fake application logs (growing, never rotated) ───────────────────────────
mkdir -p /var/log/app/archive
for i in $(seq 1 200); do
  echo "$(date -d "-${i} minutes" '+%Y-%m-%d %H:%M:%S') INFO  request processed path=/api/v1/users latency=42ms" >> /var/log/app/app.log
  echo "$(date -d "-${i} minutes" '+%Y-%m-%d %H:%M:%S') INFO  request processed path=/api/v1/orders latency=18ms" >> /var/log/app/app.log
done
echo "$(date) ERROR connection pool exhausted, retrying..." >> /var/log/app/app.log

# Create a stale rotate-status.log showing the last "successful" run was days ago
echo "$(date -d '-3 days' '+%Y-%m-%d %H:%M:%S'): SUCCESS — rotated 2048 bytes" > /var/log/rotate-status.log

# ── BUG: crontab uses bare name, not full path ───────────────────────────────
# cron's PATH = /usr/bin:/bin — rotate-logs.sh is in /usr/local/bin
# The job silently produces no output (MAILTO="" suppresses errors)
crontab -r 2>/dev/null || true
echo 'MAILTO=""' > /tmp/crontab_setup
echo '*/5 * * * * rotate-logs.sh >> /var/log/rotate-status.log 2>&1' >> /tmp/crontab_setup
crontab /tmp/crontab_setup
rm /tmp/crontab_setup

# ── README ───────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║       CRON: Log Rotation Is Silently Failing             ║
╚══════════════════════════════════════════════════════════╝

/var/log/app/app.log is growing without bound.
Cron is scheduled to rotate it every 5 minutes, but it's not working.

Investigate:
  crontab -l                              # see the scheduled job
  cat /var/log/rotate-status.log         # last rotation was days ago
  ls -lh /var/log/app/                   # log is large and unrotated
  ls -lh /var/log/app/archive/           # no recent archives

The script itself works fine:
  rotate-logs.sh                         # try running it directly

Cron logs (may be empty without syslogd):
  grep cron /var/log/syslog 2>/dev/null | tail -5

After fixing the crontab:
  crontab -e                             # fix the entry
  cat /var/log/rotate-status.log        # run manually to confirm, or wait
EOF

# ── .bashrc banner ───────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'BASHEOF'

echo ""
echo "  PROBLEM: Cron — Log Rotation Is Silently Failing"
echo "  Run: crontab -l && cat /var/log/rotate-status.log"
echo "  Read README.txt for full context."
echo ""
BASHEOF

chown -R user:user /home/user
touch /var/log/rotate-status.log
chmod 666 /var/log/rotate-status.log
