COMPOSE := docker compose -f backend/docker-compose.yml
ENV_FILE ?= .env.production
PROD_COMPOSE := docker compose --env-file "$(ENV_FILE)" -f compose.prod.yml
DEPLOY_HOST ?= vmerukormi
DEPLOY_DIR ?= /var/www/vmerukormi

.PHONY: seed db-up db-stop db-deploy db-setup prod-build prod-up prod-down prod-logs prod-migrate prod-seed deploy

deploy:
	DEPLOY_HOST="$(DEPLOY_HOST)" DEPLOY_DIR="$(DEPLOY_DIR)" bash deploy/deploy.sh

seed:
	npm run db:seed

db-up:
	$(COMPOSE) up -d --wait

db-stop:
	$(COMPOSE) stop

db-deploy:
	npm run db:deploy

db-setup: db-up db-deploy seed

prod-build:
	$(PROD_COMPOSE) build

prod-up:
	$(PROD_COMPOSE) up -d --build

prod-down:
	$(PROD_COMPOSE) down

prod-logs:
	$(PROD_COMPOSE) logs -f app nginx

prod-migrate:
	$(PROD_COMPOSE) run --rm migrate

prod-seed:
	$(PROD_COMPOSE) run --rm migrate npm run db:seed
