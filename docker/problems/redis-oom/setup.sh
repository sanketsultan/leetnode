#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq redis-server

# ── Broken redis config: maxmemory 1mb with noeviction ──────────────────────
# Real production accident: someone set maxmemory during a "memory saving"
# effort without understanding the policy. All writes now fail with OOM.
cat > /etc/redis/redis.conf << 'REDISEOF'
# LeetNode sandbox — redis config
bind 127.0.0.1
port 6379
daemonize no
loglevel notice
logfile /var/log/redis/redis-server.log

# BUG: maxmemory is absurdly low — 1mb won't hold any real workload
maxmemory 1mb
maxmemory-policy noeviction

save ""
dir /var/lib/redis
REDISEOF

mkdir -p /var/log/redis /var/lib/redis
chown -R redis:redis /var/log/redis /var/lib/redis 2>/dev/null || true

# ── App that shows the failure ───────────────────────────────────────────────
cat > /home/user/cache_test.py << 'PYEOF'
#!/usr/bin/env python3
"""Simulates an API caching layer. Shows how redis OOM affects writes."""
import subprocess, sys

def rc(cmd):
    r = subprocess.run(['redis-cli'] + cmd.split(), capture_output=True, text=True)
    return r.stdout.strip()

pong = rc('ping')
if pong != 'PONG':
    print('ERROR: Redis not responding. Run: service redis-server start')
    sys.exit(1)

print(f'redis ping         -> {pong}')
print(f'redis info version -> {rc("info server"[:12])}')
print()

for i in range(6):
    key = f'api:cache:session:{i:04d}'
    val = 'x' * 800
    out = rc(f'set {key} {val}')
    status = '✓' if out == 'OK' else '✗'
    print(f'  SET {key}  {status}  {out}')

print()
print('Each ✗ is a cache write failure. Your API is returning errors.')
PYEOF
chmod +x /home/user/cache_test.py

# ── README ───────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║      REDIS OOM: Cache Is Rejecting All Writes            ║
╚══════════════════════════════════════════════════════════╝

Production is on fire. Your caching layer is returning:

  (error) OOM command not allowed when used memory > 'maxmemory'

Redis is running. The config is the problem.

Investigate:
  redis-cli ping
  redis-cli set testkey testvalue         # <-- this is failing
  redis-cli info memory
  cat /etc/redis/redis.conf | grep maxmemory

After editing the config, apply the change:
  service redis-server restart

  OR (live, no restart required):
  redis-cli config set maxmemory 256mb

Verify the fix:
  redis-cli set testkey testvalue         # should return OK
  python3 /home/user/cache_test.py        # all rows should show ✓
EOF

# ── .bashrc banner ───────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'BASHEOF'

echo ""
echo "  PROBLEM: Redis OOM — Cache Is Rejecting All Writes"
echo "  Run: redis-cli set testkey testvalue"
echo "  Read README.txt for full context."
echo ""
BASHEOF

chown -R user:user /home/user
