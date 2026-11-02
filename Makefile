# ==============================================================================
# Recon Desk - Makefile
# Order, payment, COD, and freight reconciliation platform for D2C brands.
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Paths & Binaries
VENV := backend/.venv
PYTHON := $(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,python3)
ALEMBIC := $(if $(wildcard $(VENV)/bin/alembic),$(VENV)/bin/alembic,alembic)
UVICORN := $(if $(wildcard $(VENV)/bin/uvicorn),$(VENV)/bin/uvicorn,uvicorn)
PYTEST := $(if $(wildcard $(VENV)/bin/pytest),$(VENV)/bin/pytest,pytest)
NPM := npm --prefix frontend
NPX := npx --prefix frontend

# Colors for terminal output
BOLD := \033[1m
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

# ==============================================================================
# Help
# ==============================================================================

.PHONY: help
help: ## Show this help message with available commands
	@echo -e "$(BOLD)Recon Desk Developer CLI$(RESET)"
	@echo -e "Usage: make $(CYAN)<target>$(RESET)\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ==============================================================================
# Environment & Setup
# ==============================================================================

.PHONY: setup
setup: env install db migrate seed ## Initial one-command bootstrap: env, dependencies, DB, migrations, and seed data
	@echo -e "$(GREEN)✓ Setup complete! Run 'make dev' to start development servers.$(RESET)"

.PHONY: env
env: ## Create .env from .env.example if it does not exist
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo -e "$(GREEN)✓ Created .env from .env.example$(RESET)"; \
	else \
		echo -e "$(YELLOW).env already exists, skipping$(RESET)"; \
	fi

.PHONY: install
install: install-backend install-frontend ## Install all dependencies (backend venv + frontend npm)

.PHONY: install-backend
install-backend: ## Set up Python virtualenv and install backend package with dev deps
	@if [ ! -d $(VENV) ]; then \
		echo "Creating virtual environment in $(VENV)..."; \
		python3 -m venv $(VENV); \
	fi
	$(VENV)/bin/pip install --upgrade pip
	cd backend && ../$(VENV)/bin/pip install -e ".[dev]"
	@echo -e "$(GREEN)✓ Backend dependencies installed$(RESET)"

.PHONY: install-frontend
install-frontend: ## Install frontend node modules
	$(NPM) install
	@echo -e "$(GREEN)✓ Frontend dependencies installed$(RESET)"

# ==============================================================================
# Database & Infrastructure
# ==============================================================================

.PHONY: db
db: ## Start local PostgreSQL container via Docker Compose
	docker compose up -d db
	@echo -e "$(GREEN)✓ PostgreSQL running on port 5432$(RESET)"

.PHONY: db-down
db-down: ## Stop PostgreSQL container
	docker compose down
	@echo -e "$(YELLOW)PostgreSQL stopped$(RESET)"

.PHONY: db-reset
db-reset: ## Tear down database volume and recreate clean PostgreSQL instance
	docker compose down -v
	docker compose up -d db
	@echo -e "$(GREEN)✓ Clean PostgreSQL database started$(RESET)"

.PHONY: db-shell
db-shell: ## Open interactive psql shell inside the PostgreSQL container
	docker compose exec db psql -U recon -d recon

# ==============================================================================
# Database Migrations & Seeds
# ==============================================================================

.PHONY: migrate
migrate: ## Run all pending Alembic database migrations
	@echo "Applying database migrations..."
	cd backend && ../$(ALEMBIC) upgrade head
	@echo -e "$(GREEN)✓ Database migrations up to date$(RESET)"

.PHONY: migrate-down
migrate-down: ## Roll back the most recent database migration
	cd backend && ../$(ALEMBIC) downgrade -1
	@echo -e "$(YELLOW)✓ Rolled back last migration$(RESET)"

.PHONY: migration
migration: ## Create a new Alembic migration revision. Usage: make migration m="add_foo"
	@if [ -z "$(m)" ]; then \
		echo -e "$(YELLOW)Please provide a migration message: make migration m=\"message\"$(RESET)"; \
		exit 1; \
	fi
	cd backend && ../$(ALEMBIC) revision --autogenerate -m "$(m)"

.PHONY: seed
seed: ## Generate test data files and import seed orders, settlements, COD, and freight
	@echo "Seeding database with test data..."
	cd backend && ../$(PYTHON) -m scripts.seed --import --reset
	@echo -e "$(GREEN)✓ Seed data loaded successfully$(RESET)"

# ==============================================================================
# Development Servers
# ==============================================================================

.PHONY: dev
dev: ## Run both backend (port 8000) and frontend (port 3000) concurrently
	@echo -e "$(BOLD)Starting Recon Desk development servers...$(RESET)"
	@trap 'kill 0' SIGINT; \
	make dev-backend & \
	make dev-frontend & \
	wait

.PHONY: dev-backend
dev-backend: ## Start FastAPI backend server with hot reloading on http://localhost:8000
	cd backend && ../$(UVICORN) app.main:app --host 0.0.0.0 --port 8000 --reload

.PHONY: dev-frontend
dev-frontend: ## Start Next.js frontend development server on http://localhost:3000
	$(NPM) run dev

# ==============================================================================
# Testing & Code Quality
# ==============================================================================

.PHONY: test
test: test-backend test-frontend ## Run all test suites (backend pytest + frontend playwright)

.PHONY: test-backend
test-backend: ## Run backend tests with Pytest. Usage: make test-backend [k="keyword"]
	cd backend && ../$(PYTEST) $(if $(k),-k "$(k)",)

.PHONY: test-frontend
test-frontend: ## Run frontend Playwright end-to-end tests
	$(NPX) playwright test

.PHONY: lint
lint: lint-frontend ## Run linters across the codebase

.PHONY: lint-frontend
lint-frontend: ## Run Next.js lint on frontend
	$(NPM) run lint

.PHONY: build
build: ## Build Next.js production frontend
	$(NPM) run build

# ==============================================================================
# Cleanup
# ==============================================================================

.PHONY: clean
clean: ## Remove build artifacts, pycache, and temporary files
	rm -rf backend/.pytest_cache
	rm -rf backend/recon_desk_backend.egg-info
	find backend -type d -name "__pycache__" -exec rm -rf {} +
	find backend -type f -name "*.pyc" -delete
	rm -rf frontend/.next
	rm -rf frontend/test-results
	@echo -e "$(GREEN)✓ Cleaned build artifacts and caches$(RESET)"

