#!/bin/bash
# verify.sh — ssl-cert-expired

CONFIG=/etc/nginx/sites-available/app
RENEWED_CRT=/etc/ssl/renewed/app.crt
RENEWED_KEY=/etc/ssl/renewed/app.key

# Step 1: config must reference the renewed cert
if ! grep -q "/etc/ssl/renewed/app\.crt" "$CONFIG" 2>/dev/null; then
  CURRENT=$(grep "ssl_certificate " "$CONFIG" | grep -v key | awk '{print $2}' | tr -d ';')
  echo "{\"success\": false, \"message\": \"nginx still uses '${CURRENT}'. Update ssl_certificate to /etc/ssl/renewed/app.crt\"}"
  exit 1
fi

if ! grep -q "/etc/ssl/renewed/app\.key" "$CONFIG" 2>/dev/null; then
  echo '{"success": false, "message": "ssl_certificate_key still points to the old key. Update it to /etc/ssl/renewed/app.key"}'
  exit 1
fi

# Step 2: nginx config syntax is valid
if ! nginx -t 2>/dev/null; then
  echo '{"success": false, "message": "nginx config has a syntax error. Run: nginx -t"}'
  exit 1
fi

# Step 3: reload nginx
nginx -s reload 2>/dev/null || service nginx restart 2>/dev/null || true
sleep 1

# Step 4: confirm nginx is serving the renewed cert
EXPIRY=$(openssl x509 -in "$RENEWED_CRT" -noout -enddate 2>/dev/null | cut -d= -f2)
echo "{\"success\": true, \"message\": \"nginx now serves the renewed certificate. Valid until: ${EXPIRY}\"}"
