# GitHub Actions + Terraform Setup

## 1. Install Terraform
```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
```

## 2. Configure AWS credentials locally
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region (us-east-1), output (json)
```

## 3. Provision infrastructure
```bash
# edit terraform/variables.tf — set your domain, repo URL, instance type

make infra-init
make infra-plan    # review what will be created
make infra-apply   # creates EC2 + Elastic IP (~2 min)

make ip            # prints the IP — add this as DNS A record for leetnode.io
```

## 4. Add GitHub repository secrets

Go to: GitHub repo → Settings → Secrets → Actions → New secret

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `EC2_HOST` | Elastic IP from `make ip` |
| `EC2_SSH_KEY` | Contents of `~/.ssh/id_rsa` (private key) |
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (hub.docker.com → Account Settings → Security) |
| `POSTHOG_KEY` | PostHog project API key (posthog.com) |
| `DOMAIN` | `leetnode.io` |
| `RESEND_API_KEY` | From resend.com → API Keys (after adding leetnode.io domain) |
| `FEEDBACK_TO` | Your personal email to receive feedback |
| `CF_API_TOKEN` | Cloudflare API token (see Cloudflare setup below) |
| `CF_ACCOUNT_ID` | Cloudflare → top-right account menu → Account ID |

## 5. Cloudflare setup (one-time, ~15 minutes)

### A. Create D1 database
```bash
# Install wrangler globally
npm install -g wrangler
wrangler login   # opens browser to authorize

# Create the database (copy the ID it prints)
wrangler d1 create leetnode

# Apply schema
wrangler d1 execute leetnode --file=db/schema.sql --remote
```

Paste the `database_id` into `workers/feedback/wrangler.toml` replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### B. Deploy the Worker manually (first time)
```bash
cd workers/feedback
npm install
npx wrangler secret put RESEND_API_KEY    # paste key from resend.com
npx wrangler secret put FEEDBACK_TO       # your personal email
npx wrangler secret put ALLOWED_ORIGIN    # https://leetnode.io
npx wrangler deploy
```

The Worker runs at `leetnode.io/api/feedback` — intercepts feedback requests at the edge before they hit EC2.

### C. Create Cloudflare API token (for GitHub Actions)
Cloudflare dashboard → My Profile → API Tokens → Create Token

Use the **"Edit Cloudflare Workers"** template, then add:
- Account: Workers D1 Storage — Edit
- Zone: leetnode.io — DNS Read

Copy the token → GitHub secret `CF_API_TOKEN`

### D. Resend — send from connect@leetnode.io
1. Go to resend.com → sign up (free, 3000 emails/month)
2. Domains → Add Domain → type `leetnode.io`
3. It gives you 3 DNS records → add them in Cloudflare DNS
4. Once verified → API Keys → Create API Key → copy it
5. Add as GitHub secret `RESEND_API_KEY` and run wrangler secret put above

### E. R2 bucket (for future problem assets)
```bash
# Create bucket
wrangler r2 bucket create leetnode-problems

# Upload all problem JSON files
wrangler r2 object put leetnode-problems/nginx-502.json --file=problems/nginx-502.json
# (repeat for each problem)
```

Problems can then be fetched from `https://pub.r2.dev/...` or via a Worker.

### F. WAF rules (Cloudflare dashboard — Security → WAF)

**Rule 1 — Rate limit session creation** (stops container spam):
```
Field: URI Path  Operator: equals  Value: /api/sessions
AND
Field: Request Method  Operator: equals  Value: POST
→ Action: Rate limit — 5 requests/minute per IP — block for 1 hour
```

**Rule 2 — Block bad bots on API routes:**
```
Field: URI Path  Operator: contains  Value: /api/
AND
Field: Bot Score  Operator: less than  Value: 10
→ Action: Block
```

### G. Cache rules (Cloudflare dashboard — Caching → Cache Rules)

**Rule 1 — Cache Next.js static assets forever:**
```
URL path: /_next/static/*
→ Cache: Cache everything
→ Edge TTL: 1 month
→ Browser TTL: 1 week
```

**Rule 2 — Skip cache on API routes:**
```
URL path: /api/*
→ Cache: Bypass cache
```

### H. DNS — make sure your A record is orange-cloud (proxied)
Cloudflare → DNS → A record for `leetnode.io` → click grey cloud to make it orange.

This enables DDoS protection, CDN, and SSL termination at edge.

## 6. Push to main → auto deploys

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build Docker images → push to Docker Hub (only when docker/ files change)
3. SSH into EC2 → pull code + images → rebuild → restart PM2

## Pipeline overview

```
push to main
    │
    ├── CI (ci.yml) — runs on every push + PR
    │     ├── Backend tests (Jest)
    │     ├── Backend type-check
    │     └── Frontend build check
    │
    └── Deploy (deploy.yml) — runs on push to main only
          ├── 1. Tests must pass
          ├── 2. Build Docker images → Docker Hub (skipped if no docker/ changes)
          └── 3. SSH to EC2 → pull images → rebuild app → pm2 restart
```

## Common commands

```bash
make ssh           # SSH into the server
make logs          # tail PM2 logs (run on server)
make infra-plan    # preview infrastructure changes
make infra-apply   # apply infrastructure changes
```

## Disaster Recovery

If the server dies, spin up a new one with Terraform:

```bash
# Set your values in terraform/variables.tf, then:
make infra-destroy  # destroy old server (if still exists)
make infra-apply    # creates new EC2 + Elastic IP
make ip             # get new IP — update DNS A record
```

The new server auto-bootstraps via `terraform/user_data.sh`:
- Installs all dependencies (Node 20, Docker, PM2, nginx, certbot)
- Clones the repo using your GitHub PAT (set `github_pat` in variables.tf or as TF_VAR)
- Pulls Docker images from Docker Hub (set `dockerhub_username` in variables.tf)
- Builds backend + frontend
- Configures nginx + SSL
- Starts PM2

Or run manually on any fresh Ubuntu 24.04 server:
```bash
sudo DOMAIN=leetnode.io \
     DOCKERHUB_USERNAME=myuser \
     GITHUB_PAT=ghp_xxxx \
     bash scripts/recover.sh
```

## Terraform variables for full automation

Add to `terraform/variables.tf` or pass as env vars:
```bash
export TF_VAR_dockerhub_username="myuser"
export TF_VAR_github_pat="ghp_xxxx"
export TF_VAR_domain="leetnode.io"
```
