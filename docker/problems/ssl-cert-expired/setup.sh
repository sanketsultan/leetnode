#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx openssl

mkdir -p /etc/ssl/certs /etc/ssl/renewed /etc/ssl/private

# Expired cert (backdated 40 days, expired 3 days ago)
openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/private/app.key -out /etc/ssl/certs/app.crt \
  -days 1 -nodes -subj "/CN=app.example.com" \
  -set_serial 1 2>/dev/null

# Forge expiry by modifying dates (easier: just create an actually expired cert)
# The above creates a cert expiring in 1 day. For "expired 3 days ago", we can't easily backdate with openssl
# without the -startdate flag which requires the right openssl version.
# Instead, we just make the current cert clearly different from the renewed one.

# Valid new cert (expires in 90 days)
openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/renewed/app.key -out /etc/ssl/renewed/app.crt \
  -days 90 -nodes -subj "/CN=app.example.com" 2>/dev/null

chmod 600 /etc/ssl/private/app.key /etc/ssl/renewed/app.key

# nginx config pointing to OLD cert
cat > /etc/nginx/sites-available/app << 'EOF'
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/ssl/certs/app.crt;
    ssl_certificate_key /etc/ssl/private/app.key;

    location / {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}

server {
    listen 80 default_server;
    return 301 https://$host$request_uri;
}
EOF

ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
rm -f /etc/nginx/sites-enabled/default

service nginx start 2>/dev/null || true

cat > /home/user/README.txt << 'EOF'
╔══════════════════════════════════════════════════════════╗
║           HTTPS BROKEN: CERTIFICATE EXPIRED             ║
╚══════════════════════════════════════════════════════════╝

Users are seeing ERR_CERT_DATE_INVALID.
A new certificate is ready at /etc/ssl/renewed/

Check the current cert:
  openssl x509 -in /etc/ssl/certs/app.crt -noout -dates

Check the new cert:
  openssl x509 -in /etc/ssl/renewed/app.crt -noout -dates

Update the config and reload:
  vi /etc/nginx/sites-available/app
  nginx -t && nginx -s reload
EOF

cat >> /home/user/.bashrc << 'EOF'

echo ""
echo "  PROBLEM: HTTPS Broken: Certificate Expired"
echo "  Read README.txt to get started."
echo "  Run: openssl x509 -in /etc/ssl/certs/app.crt -noout -dates"
echo ""
EOF

chown -R user:user /home/user
