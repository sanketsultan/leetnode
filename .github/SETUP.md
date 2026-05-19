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

## 5. Push to main → auto deploys

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

GitHub Actions will:
1. Run tests
2. Build Docker images → push to Docker Hub
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
          ├── 2. Build Docker images → Docker Hub
          └── 3. SSH to EC2 → deploy
```

## Common commands

```bash
make ssh           # SSH into the server
make logs          # tail PM2 logs (run on server)
make infra-plan    # preview infrastructure changes
make infra-apply   # apply infrastructure changes
```
