.PHONY: help dev build migrate logs shell test clean

help:
	@echo "UzumBot - Available commands:"
	@echo "  make dev          Start all services in development mode"
	@echo "  make build        Build all Docker images"
	@echo "  make migrate      Run database migrations"
	@echo "  make logs         Tail all logs"
	@echo "  make logs-backend Tail backend logs"
	@echo "  make shell        Open backend Python shell"
	@echo "  make test         Run backend tests"
	@echo "  make clean        Remove all containers and volumes"
	@echo "  make superadmin   Create first superadmin user"

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

shell:
	docker compose exec backend python -c "import asyncio; from app.database import engine; print('DB connected:', engine.url)"

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-bot:
	docker compose logs -f bot

logs-worker:
	docker compose logs -f celery_worker

test:
	docker compose exec backend pytest tests/ -v

clean:
	docker compose down -v --remove-orphans

superadmin:
	docker compose exec backend python -m app.utils.create_superadmin

restart-backend:
	docker compose restart backend

restart-bot:
	docker compose restart bot

ps:
	docker compose ps
