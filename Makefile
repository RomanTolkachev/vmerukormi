COMPOSE := docker compose -f backend/docker-compose.yml

.PHONY: seed db-up db-stop db-deploy db-setup prod-build prod-up prod-down prod-logs prod-migrate

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
	docker compose -f compose.prod.yml build

prod-up:
	docker compose -f compose.prod.yml up -d --build

prod-down:
	docker compose -f compose.prod.yml down

prod-logs:
	docker compose -f compose.prod.yml logs -f app nginx

prod-migrate:
	docker compose -f compose.prod.yml run --rm migrate
