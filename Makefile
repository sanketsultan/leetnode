.PHONY: infra-init infra-plan infra-apply infra-destroy deploy logs ssh

# ── Terraform ────────────────────────────────────────────────────────────────

infra-init:
	cd terraform && terraform init

infra-plan:
	cd terraform && terraform plan

infra-apply:
	cd terraform && terraform apply

infra-destroy:
	cd terraform && terraform destroy

# ── After terraform apply, print the IP to add to your DNS ──────────────────

ip:
	cd terraform && terraform output public_ip

ssh:
	ssh ubuntu@$$(cd terraform && terraform output -raw public_ip)

# ── Local dev ────────────────────────────────────────────────────────────────

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && npm test -- --no-coverage --forceExit

# ── PM2 helpers (run on server) ──────────────────────────────────────────────

logs:
	pm2 logs

status:
	pm2 status
