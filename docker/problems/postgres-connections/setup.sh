#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq postgresql postgresql-client python3-psycopg2

# ── Configure postgres with dangerously low max_connections ─────────────────
# Real scenario: a DBA set max_connections=10 to "reduce overhead" on a new
# instance. The app connection pool is sized for 25 connections. Under any
# real load, new connections fail immediately.
PG_VERSION=$(pg_lsclusters -h | awk '{print $1}' | head -1)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

# Initialize postgres cluster
service postgresql start || true
sleep 2

# Set restrictive max_connections
sed -i "s/^#*max_connections\s*=.*/max_connections = 10/" "$PG_CONF"
sed -i "s/^#*shared_buffers\s*=.*/shared_buffers = 32MB/" "$PG_CONF"

service postgresql restart || true
sleep 2

# Create a database and user for the demo app
su -c "psql -c \"CREATE USER appuser WITH PASSWORD 'apppass';\"" postgres 2>/dev/null || true
su -c "psql -c \"CREATE DATABASE appdb OWNER appuser;\"" postgres 2>/dev/null || true
su -c "psql -d appdb -c \"CREATE TABLE IF NOT EXISTS requests (id serial PRIMARY KEY, path text, ts timestamp DEFAULT now());\"" postgres 2>/dev/null || true

service postgresql stop || true

# ── App that demonstrates the connection exhaustion ──────────────────────────
cat > /home/user/stress_test.py << 'PYEOF'
#!/usr/bin/env python3
"""
Simulates what happens when 15 app workers try to connect simultaneously.
In production: users see 500 errors, connection timeouts.
"""
import subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

def try_connect(worker_id):
    try:
        import psycopg2
        conn = psycopg2.connect(
            host='localhost', port=5432,
            database='appdb', user='appuser', password='apppass',
            connect_timeout=3
        )
        cur = conn.cursor()
        cur.execute("INSERT INTO requests (path) VALUES (%s)", (f"/worker/{worker_id}",))
        conn.commit()
        conn.close()
        return worker_id, True, "OK"
    except Exception as e:
        return worker_id, False, str(e)

print("Simulating 15 concurrent app workers connecting to postgres...")
print()

with ThreadPoolExecutor(max_workers=15) as ex:
    futures = [ex.submit(try_connect, i) for i in range(1, 16)]
    for f in as_completed(futures):
        wid, ok, msg = f.result()
        icon = '✓' if ok else '✗'
        print(f"  Worker {wid:02d}  {icon}  {msg[:80]}")

print()
print("Investigate: psql -U appuser -d appdb -c 'SHOW max_connections;'")
PYEOF
chmod +x /home/user/stress_test.py

# ── README ───────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║   POSTGRES: Too Many Clients — Connections Exhausted     ║
╚══════════════════════════════════════════════════════════╝

Production is returning:
  FATAL: sorry, too many clients already

The app pool is configured for 25 connections. Postgres disagrees.

Investigate:
  python3 /home/user/stress_test.py       # watch workers fail
  psql -U appuser -d appdb               # connect directly
  SHOW max_connections;                  # see the limit
  SELECT count(*) FROM pg_stat_activity; # current connections

Config file:
  sudo cat /etc/postgresql/*/main/postgresql.conf | grep max_connections

After editing postgresql.conf, restart postgres:
  service postgresql restart

Verify:
  python3 /home/user/stress_test.py      # all 15 workers should succeed

NOTE: superuser_reserved_connections (default 3) are reserved for postgres.
      Effective user connections = max_connections - superuser_reserved_connections
EOF

# ── .bashrc banner ───────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'BASHEOF'

echo ""
echo "  PROBLEM: Postgres — Too Many Clients (connections exhausted)"
echo "  Run: python3 /home/user/stress_test.py"
echo "  Read README.txt for full context."
echo ""
BASHEOF

chown -R user:user /home/user
