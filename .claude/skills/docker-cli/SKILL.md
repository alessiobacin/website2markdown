---
name: docker-cli
description: Use Docker CLI and Docker Compose for local stacks, health checks, logs, and support services. Use it when the task requires a local runtime or infrastructure services.
allowed-tools: Bash(docker *)
---

# Docker CLI

Use `docker` to bring local services up and down, inspect logs, and verify runtimes required by Supabase or by staging/prod environments.

## Basic Commands

```bash
docker --version
docker compose version
docker ps
docker compose up -d
docker compose down
docker compose logs --tail=200
docker compose ps
docker volume ls
docker network ls
```

## Operational Patterns

- prefer `docker compose up -d` and `docker compose logs` for repeatable local stacks
- use `docker compose ps` and `docker ps` for quick health checks
- collect short, relevant logs instead of full dumps

## Note

- if Docker is not available, stop before using the local Supabase CLI
- in Linux environments verify daemon permissions or membership in the `docker` group