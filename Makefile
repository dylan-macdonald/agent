.PHONY: help install dev-install start stop restart logs db-up db-down db-reset test test-cov lint format clean

# Default target
help:
	@echo "Autonomous Personal Assistant - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install        Install production dependencies"
	@echo "  make dev-install    Install development dependencies"
	@echo ""
	@echo "Docker:"
	@echo "  make start          Start all services (PostgreSQL, Redis)"
	@echo "  make stop           Stop all services"
	@echo "  make restart        Restart all services"
	@echo "  make logs           Show service logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-up          Start database services only"
	@echo "  make db-down        Stop database services"
	@echo "  make db-reset       Reset database (WARNING: deletes all data)"
	@echo "  make test-db        Test database connectivity"
	@echo ""
	@echo "Testing:"
	@echo "  make test           Run all tests"
	@echo "  make test-cov       Run tests with coverage report"
	@echo "  make test-unit      Run unit tests only"
	@echo "  make test-int       Run integration tests only"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           Run linter (ruff)"
	@echo "  make format         Format code (ruff)"
	@echo "  make type-check     Run type checker (mypy)"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          Clean temporary files"
	@echo "  make backup         Create database backup"
	@echo "  make cost-report    Generate cost report"

# Installation
install:
	uv pip install -e .

dev-install:
	uv pip install -e ".[dev]"

# Docker services
start:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Services started successfully!"

stop:
	docker-compose down

restart: stop start

logs:
	docker-compose logs -f

# Database
db-up:
	docker-compose up -d postgres redis
	@echo "Waiting for databases to be ready..."
	@sleep 3
	@echo "Databases started successfully!"

db-down:
	docker-compose down postgres redis

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ]
	docker-compose down -v
	rm -rf data/postgres/* data/redis/*
	docker-compose up -d postgres redis
	@echo "Database reset complete!"

test-db:
	python scripts/test_connectivity.py

# Testing
test:
	pytest

test-cov:
	pytest --cov=src --cov-report=html --cov-report=term
	@echo "Coverage report generated in htmlcov/index.html"

test-unit:
	pytest tests/unit/

test-int:
	pytest tests/integration/

# Code quality
lint:
	ruff check src/ tests/

format:
	ruff format src/ tests/

type-check:
	mypy src/

# Utilities
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete
	@echo "Cleaned temporary files!"

backup:
	@echo "Creating database backup..."
	@mkdir -p data/backups
	@docker-compose exec postgres pg_dump -U assistant assistant | gzip > data/backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup created in data/backups/"

cost-report:
	python scripts/cost_report.py

# Development shortcuts
.PHONY: dev run shell

dev: dev-install db-up
	@echo "Development environment ready!"

run:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

shell:
	python -i -c "import asyncio; from src.utils.config import settings; from src.memory.database import init_database; from src.memory.cache import init_cache; print('Database and cache available. Use: await init_database(), await init_cache()')"
