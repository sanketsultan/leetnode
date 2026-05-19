Deploy LeetNode to a production server (Hetzner CX41 or similar).

Before starting, confirm:
- Server IP address
- SSH access works: `ssh root@<ip>`
- Domain DNS is pointed to the server IP

**Step 1 — Server setup** (first deploy only):
```bash
ssh root@<ip> << 'EOF'
apt-get update && apt-get install -y docker.io nginx certbot python3-certbot-nginx
systemctl enable docker && systemctl start docker
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
EOF
```

**Step 2 — Push code** (if not already on GitHub):
Run `/commit` then push to `github.com/sanketsultan/leetnode`

**Step 3 — Deploy on server:**
```bash
ssh root@<ip> << 'EOF'
cd /opt
git clone https://github.com/sanketsultan/leetnode.git || git -C /opt/leetnode pull
cd /opt/leetnode

# Build Docker images
./scripts/build-images.sh

# Install backend deps
cd backend && npm install && npm run build
cp .env.example .env
# Edit .env: set FRONTEND_URL=https://leetnode.io, WS_PUBLIC_URL=wss://leetnode.io/ws

# Start backend as systemd service
cd /opt/leetnode
cat > /etc/systemd/system/leetnode-backend.service << 'SVC'
[Unit]
Description=LeetNode Backend
After=network.target docker.service

[Service]
WorkingDirectory=/opt/leetnode/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable leetnode-backend
systemctl restart leetnode-backend

# Build and start frontend
cd /opt/leetnode/frontend
npm install && npm run build
# Start with PM2 or systemd similarly
EOF
```

**Step 4 — SSL + Nginx:**
```bash
certbot --nginx -d leetnode.io -d www.leetnode.io
```

The Nginx config should proxy:
- `/api/*` → `http://localhost:3001`
- `/ws` → `http://localhost:3002` (with `Upgrade` headers + `proxy_read_timeout 1800s`)
- Everything else → Next.js on port 3000

**Step 5 — Verify:**
```
curl https://leetnode.io/api/health
```

Ask the user for their server IP before proceeding. Do not run any SSH commands without confirmation.
