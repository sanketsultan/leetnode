# LeetNode

A platform for practicing real infrastructure debugging. Not tutorials. Not multiple choice. A broken Linux container and a terminal — same as on-call.

---

## What is this?

LeetNode is built around a simple idea: the gap between knowing how something works and being able to fix it when it's broken at 2am is huge. Most learning platforms teach the former. This one tries to close the latter.

You pick a problem, get a real Docker container with a real broken system, and debug it in a browser terminal. When you think you've fixed it, you click verify — the backend actually runs the check inside the container and tells you pass or fail.

No hand-holding. No hints until you've spent some time on it. Just you and the logs.

## The four qualities

Every problem on LeetNode is designed to develop one of four things we think separates good engineers from great ones:

- **System Thinking** — understanding why a system fails, not just where
- **Distribution** — reasoning about networked systems, services talking to each other
- **Perseverance** — grinding through a problem methodically when it's not obvious
- **Curiosity** — going one level deeper than you need to, because you want to understand

## Problems (11 so far)

| Problem | Difficulty | Quality |
|---|---|---|
| Redis OOM: maxmemory Too Low | Easy | Perseverance |
| Server Won't Start: Disk Full | Easy | Perseverance |
| Logs Never Rotate: Growing Forever | Easy | Perseverance |
| 502 Bad Gateway: Wrong Upstream Port | Easy | Distribution |
| HTTPS Broken: Certificate Expired | Easy | Distribution |
| Missing no_grad During Inference | Easy | System Thinking |
| Tensor Not Moved to GPU | Easy | System Thinking |
| Cron: Log Rotation Is Silently Failing | Medium | System Thinking |
| GPU Memory Leak in Training Loop | Medium | Perseverance |
| Batch Processor Leaking Memory | Medium | Curiosity |
| Postgres: Too Many Clients Already | Hard | System Thinking |

More coming. The goal is 40–50.

## Stack

- **Frontend** — Next.js 14 (App Router), TypeScript
- **Backend** — Express, TypeScript
- **Containers** — Docker, one container per problem session
- **Terminal** — xterm.js over WebSocket
- **Auth** — NextAuth v4 with GitHub OAuth
- **Infra** — EC2 + nginx + Docker Compose (Terraform config included)
- **Workers** — Cloudflare Workers (feedback endpoint)

## Running locally

You'll need Docker, Node 20+, and npm.

```bash
# Clone
git clone https://github.com/your-username/leetnode.git
cd leetnode

# Build the base Docker image first
docker build -t leetnode-base:latest docker/base/

# Build a problem image (example: redis-oom)
docker build -t leetnode-problem-redis-oom:latest docker/problems/redis-oom/

# Start backend + frontend
cp .env.example .env        # fill in GH_CLIENT_ID, GH_CLIENT_SECRET, NEXTAUTH_SECRET
docker compose -f docker-compose.dev.yml up
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:3001`.

To build all problem images at once:

```bash
make build-problems
```

## Environment variables

```bash
# GitHub OAuth (create an app at github.com/settings/developers)
GH_CLIENT_ID=
GH_CLIENT_SECRET=

# Random string — run: openssl rand -base64 32
NEXTAUTH_SECRET=

# Where the frontend is (used for OAuth callback)
NEXTAUTH_URL=http://localhost:3000

# Backend URL (used by frontend)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Adding a problem

Each problem lives in `docker/problems/<slug>/` and has three files:

- `Dockerfile` — builds the broken environment
- `setup.sh` — creates the broken state inside the container
- `verify.sh` — checks whether the fix is correct, outputs JSON

And a `problems/<slug>.json` with the title, description, hints, and metadata.

If you want to contribute a problem, open a PR. The main things we care about: the bug should be realistic (something that actually happens in production), the verify script should be deterministic, and the hints shouldn't give it away immediately.

## Deploying

Terraform config is in `terraform/`. It provisions an EC2 instance, VPC, Elastic IP, and security group on AWS.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in your values
terraform init
terraform apply
```

GitHub Actions handles deploys on push to `main` — builds Docker images, SSHs into the server, pulls and restarts.

## License

MIT. Do whatever you want with it.

---

Built by [@sanketsultx](https://github.com/sanketsultx). If it's useful to you, [buy me a coffee](https://buymeacoffee.com/sanketsultx).
