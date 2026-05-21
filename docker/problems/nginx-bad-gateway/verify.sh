#!/bin/bash
# verify.sh — nginx-bad-gateway
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

CONFIG=/etc/nginx/sites-available/api

# ── Step 1: Static check — is the port fixed? ─────────────────────────────────
PORT=$(grep -oP 'server 127\.0\.0\.1:\K\d+' "$CONFIG" 2>/dev/null | head -1)

if [ "$PORT" != "8081" ]; then
  echo "{\"success\": false, \"message\": \"The upstream port in /etc/nginx/sites-available/api is still wrong (found: ${PORT:-not set}). It should be 8081.\"}"
  exit 1
fi

# ── Step 2: Syntax check ──────────────────────────────────────────────────────
if ! nginx -t 2>/dev/null; then
  echo '{"success": false, "message": "nginx config has a syntax error. Run: nginx -t"}'
  exit 1
fi

# ── Step 3: Make sure upstream app is running ─────────────────────────────────
if ! curl -sf http://127.0.0.1:8081/health >/dev/null 2>&1; then
  nohup python3 /home/user/app.py >/dev/null 2>&1 &
  sleep 1
fi

# ── Step 4: Reload nginx ──────────────────────────────────────────────────────
nginx -s reload 2>/dev/null || service nginx restart 2>/dev/null || true
sleep 1

# ── Step 5: End-to-end test through nginx ─────────────────────────────────────
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/api/health 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
  echo '{"success": true, "message": "nginx is correctly proxying to port 8081. The API returns 200 OK."}'
else
  echo "{\"success\": false, \"message\": \"nginx config looks right but the request still fails (HTTP ${HTTP_CODE:-000}). Did you reload nginx? Run: nginx -s reload\"}"
  exit 1
fi
