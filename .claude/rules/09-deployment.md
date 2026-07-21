---
description: Deployment, Docker, and environment rules — read when working on Docker, deployment, staging/prod environments, or health checks
alwaysApply: false
---

# 09 — DEPLOYMENT

## V11 Port Convention

| Environment | Port formula | Example (module 63) |
|-------------|-------------|---------------------|
| Dev | 5000 + n | 5063 |
| Staging | 6000 + n | 6063 |
| Prod | 7000 + n | 7063 |

The module number is assigned in the V11 registry. Set it via `MODULE_NUMBER` in `.env`.

## Environments

| Environment | Infrastructure |
|-------------|----------------|
| Dev (cluster) | `CLUSTER_MODE=local`, Docker Compose, auto-discovery via Docker DNS |
| Dev (standalone) | Local `pnpm dev`, SQLite fallback if no db-layer |
| Staging | Containerized with Docker on target VM |
| Prod | Kubernetes (orchestrated) |

### Dev — Cluster Mode (primary)

In cluster mode, all V11 components run together via Docker Compose on the same network. Services discover each other automatically via Docker DNS — no manual URL configuration needed.

```bash
# .env for cluster mode
CLUSTER_MODE=local
CLUSTER_ID=dev-machine-alessio
V11_ENV=development
MODULE_NUMBER=63
# No DB_LAYER_URL, EVENT_BUS_URL, etc. needed — auto-discovered
```

```bash
docker-compose up   # all components start, discover, and connect
```

### Dev — Standalone Mode

For isolated single-component development without the full cluster:

```bash
pnpm dev   # runs on port 5000+MODULE_NUMBER
```

Infrastructure falls back: no `DB_LAYER_URL` → SQLite in `data/`. No `EVENT_BUS_URL` → events disabled.

## Core Deployment Rules

1. **Idempotency First**: All deployment scripts (`scripts/deploy.sh`) MUST be idempotent. Verify existence of DNS records, NPM proxy hosts, and certificates before creating them.
2. **Port Continuity**: Use V11 port convention (5000+n / 6000+n / 7000+n). If a custom port is needed, query existing Nginx Proxy Manager configuration before assigning.
3. **Health Checks**: Every deployed service MUST expose `/health` (V11 standard). The deployment script must verify this endpoint returns `200 OK` after the container restarts before considering the deploy successful.
4. **Environment Variables**: All deployment configuration lives in `.env` (never versioned). Use `.env.template` as the template with comments for every dependency (see `conventions/INFRASTRUCTURE-RESOLUTION.md`).
5. **Infrastructure Resolution**: Dependencies are resolved per `conventions/INFRASTRUCTURE-RESOLUTION.md` — cluster mode uses auto-discovery, non-cluster requires explicit `.env` URLs, missing `DB_LAYER_URL` triggers SQLite fallback.

## Deployment Pipeline (`scripts/deploy.sh`)

The deterministic deployment flow is:
1. **Docker Build & Push**: Builds for `linux/amd64` (ensuring compatibility with x86 VMs from ARM dev machines) and pushes to Docker Hub.
2. **DNS Records**: Creates/updates A records via Hetzner DNS API and waits for propagation (up to 300s).
3. **NPM Proxy + SSL**: Checks for existing proxy. If new, creates it and requests a Let's Encrypt certificate.
4. **VM Deploy**: Pulls the new image, restarts the container via `docker compose`, and polls the `/health` endpoint.

## Available Skills (`skills.sh`)

- `sickn33/antigravity-awesome-skills@docker-expert` — Docker/containerization
- `josiahsiegel/claude-plugin-marketplace@docker-platform-guide` — cross-platform Docker guide
