.PHONY: infra-init infra-plan infra-apply infra-destroy ip ssh \
        up down logs ps restart dev-backend dev-frontend test

# ── Terraform ────────────────────────────────────────────────────────────────

infra-init:
	cd terraform && terraform init

infra-plan:
	cd terraform && terraform plan

infra-apply:
	cd terraform && terraform apply

infra-destroy:
	cd terraform && terraform destroy

ip:
	cd terraform && terraform output public_ip

ssh:
	ssh ubuntu@$$(cd terraform && terraform output -raw public_ip)

# ── Production (Docker Compose on server) ────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose restart

# ── Local dev (without Docker) ───────────────────────────────────────────────

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && npm test -- --no-coverage --forceExit
