#!/bin/bash
# verify.sh — postgres-connections
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

PG_VERSION=$(pg_lsclusters -h 2>/dev/null | awk '{print $1}' | head -1)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

# ── Step 1: Static check — is max_connections increased? ────────────────────
MAX_CONN=$(grep -E '^max_connections\s*=' "$PG_CONF" 2>/dev/null | awk -F'=' '{print $2}' | tr -d ' ' | head -1)

if [ -z "$MAX_CONN" ]; then
  echo '{"success": false, "message": "Could not read max_connections from postgresql.conf. Is the file at the right path?"}'
  exit 1
fi

if [ "$MAX_CONN" -le 10 ] 2>/dev/null; then
  echo "{\"success\": false, \"message\": \"max_connections is still ${MAX_CONN}. Increase it to at least 50 in ${PG_CONF}, then restart postgres: service postgresql restart\"}"
  exit 1
fi

# ── Step 2: Restart postgres if not running or if config changed ─────────────
if ! pg_isready -q 2>/dev/null; then
  service postgresql restart 2>/dev/null || true
  sleep 2
fi

if ! pg_isready -q 2>/dev/null; then
  echo '{"success": false, "message": "PostgreSQL is not running. Run: service postgresql restart"}'
  exit 1
fi

# ── Step 3: Functional test — 15 concurrent connections ─────────────────────
# Pass MAX_CONN as env var so the Python heredoc (no shell substitution) can use it
export LEETNODE_MAX_CONN="$MAX_CONN"
python3 - << 'PYEOF'
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import psycopg2
except ImportError:
    # psycopg2 not available — just check live max_connections
    import subprocess
    result = subprocess.run(
        ['psql', '-U', 'appuser', '-d', 'appdb', '-tAc', 'SHOW max_connections;'],
        capture_output=True, text=True
    )
    val = result.stdout.strip()
    if result.returncode == 0 and val.isdigit() and int(val) > 10:
        print('{"success": true, "message": "max_connections set to ' + val + '. PostgreSQL is accepting connections."}')
        sys.exit(0)
    else:
        print('{"success": false, "message": "Could not verify connections. Install psycopg2 or check manually."}')
        sys.exit(1)

def try_connect(worker_id):
    try:
        conn = psycopg2.connect(
            host='localhost', port=5432,
            database='appdb', user='appuser', password='apppass',
            connect_timeout=5
        )
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
        return True, None
    except Exception as e:
        return False, str(e)

failures = []
with ThreadPoolExecutor(max_workers=15) as ex:
    futures = [ex.submit(try_connect, i) for i in range(15)]
    for f in as_completed(futures):
        ok, err = f.result()
        if not ok:
            failures.append(err)

if failures:
    first_err = (failures[0] or '')[:120]
    print(f'{{"success": false, "message": "{len(failures)}/15 connections failed. max_connections may need a restart. Error: {first_err}"}}')
    sys.exit(1)
else:
    import os
    mc = os.environ.get('LEETNODE_MAX_CONN', '?')
    print(f'{{"success": true, "message": "All 15 concurrent connections succeeded. max_connections = {mc}."}}')
    sys.exit(0)
PYEOF
exit 0
