#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx curl

# ── Upstream API app ───────────────────────────────────────────────────────────
cat > /home/user/app.py << 'PYEOF'
#!/usr/bin/env python3
"""Fake API service — listens on 8081."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/health'):
            body = json.dumps({"status": "ok", "service": "api-v1", "port": 8081}).encode()
        elif self.path.startswith('/api/'):
            body = json.dumps({"data": "response", "ok": True}).encode()
        else:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # suppress access logs

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8081), APIHandler)
    print("API service listening on :8081", flush=True)
    server.serve_forever()
PYEOF

# ── Start app in background (persists via PID file) ───────────────────────────
nohup python3 /home/user/app.py > /var/log/app-service.log 2>&1 &
echo $! > /var/run/app-service.pid

# ── Broken nginx config (upstream points to wrong port 8080) ──────────────────
cat > /etc/nginx/sites-available/api << 'NGINXEOF'
upstream api_backend {
    server 127.0.0.1:8080;   # BUG: service runs on 8081, not 8080
}

server {
    listen 80 default_server;
    server_name _;

    location /api/ {
        proxy_pass http://api_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    location /health {
        proxy_pass http://api_backend/health;
        proxy_connect_timeout 5s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api
rm -f /etc/nginx/sites-enabled/default

# ── README ────────────────────────────────────────────────────────────────────
cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║          502 BAD GATEWAY: WRONG UPSTREAM PORT            ║
╚══════════════════════════════════════════════════════════╝

The API service is RUNNING. nginx is RUNNING.
But every request returns 502 Bad Gateway.

Start here:
  curl -v http://localhost/api/health    # currently returns 502
  curl http://localhost:8081/health      # upstream is healthy

Nginx config:
  /etc/nginx/sites-available/api

After fixing, reload nginx:
  nginx -s reload

Then re-test:
  curl http://localhost/api/health       # should return 200
EOF

# ── .bashrc banner ────────────────────────────────────────────────────────────
cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "  PROBLEM: 502 Bad Gateway: Wrong Upstream Port"
echo "  Read README.txt to get started."
echo "  Run: curl -v http://localhost/api/health"
echo ""
EOF

# ── Start nginx ───────────────────────────────────────────────────────────────
service nginx start || true

chown -R user:user /home/user
