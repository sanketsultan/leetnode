#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq logrotate

mkdir -p /var/log/app

# Create a large log file (simulated 2.4GB via sparse file + real content marker)
dd if=/dev/urandom bs=1M count=50 2>/dev/null > /var/log/app/service.log
echo "$(date) ERROR  service crashed" >> /var/log/app/service.log
echo "$(date) ERROR  OOM: cannot allocate memory" >> /var/log/app/service.log

# BROKEN logrotate config: wrong path (typo — service.log.1 won't match)
cat > /etc/logrotate.d/app << 'EOF'
/var/log/app/service.log.1 {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║         LOGS NEVER ROTATE: GROWING FOREVER              ║
╚══════════════════════════════════════════════════════════╝

/var/log/app/service.log is 50MB+ and logrotate does nothing.

Debug the config:
  logrotate -d /etc/logrotate.d/app

The config is at:
  /etc/nginx/sites-available/app  -- No, logrotate config:
  /etc/logrotate.d/app

Force rotation after fixing:
  logrotate -f /etc/logrotate.d/app

Verify it worked:
  ls -lh /var/log/app/
EOF

cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "  PROBLEM: Logs Never Rotate: Growing Forever"
echo "  Read README.txt to get started."
echo "  Run: logrotate -d /etc/logrotate.d/app"
echo ""
EOF

chown -R user:user /home/user
