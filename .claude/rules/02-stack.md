---
description: Required project technology stack (V11 Modules Platform)
alwaysApply: true
---

# 02 — STACK (Modules Platform V11)

## Application Layer

- Next.js 15.x App Router
- TypeScript 5.x strict mode
- Node.js 22 LTS+
- Zod (validation everywhere)
- Drizzle (ORM)

Rules:

- no migrations to different frameworks
- App Router routing only (no Pages Router)
- initial rendering must remain **server-first**: prefer Server Components, SSR, or SSG/ISR
- use CSR only for truly interactive portions
- mandatory input validation with zod
- no business logic in route handlers
- separation: `services/` (logic), route handlers (I/O), `lib/` (clients)

## Frontend (where applicable)

- Tailwind CSS
- shadcn/ui + Radix UI primitives
- React Query (server state) + Zustand (client state)
- React Hook Form + Zod (type-safe forms)
- `@v11/design-system` — for component GUIs (CSS tokens `--v11-*`, CSS Modules, React component library)

Rules:

- consistent shadcn/ui components for app pages
- for component GUIs: use `@v11/design-system` tokens and components, CSS Modules — no hardcoded colors
- for public pages prefer SSG/ISR; for protected/tenant data prefer SSR
- GUI pages must render correctly inside the shell layout (Operator Console or Tenant Workspace)

## Database and Storage

- PostgreSQL (via db-layer or direct Drizzle)
- SQLite (better-sqlite3) — standalone fallback only
- Redis / Valkey — caching, sessions, working memory
- MinIO (S3-compatible) — files, assets, blobs
- Qdrant — vector search (KOS components)
- Neo4j CE — graph (KOS components)

## Event Bus

- Redis Streams (MVP)
- NATS JetStream (scale)
- Kafka (enterprise)

## Auth

- JWT (jose library) — access 15min, refresh 7d
- Argon2 (@node-rs/argon2)
- Custom RBAC per-tenant

## LLM Integration

- Vercel AI SDK
- Embeddings: text-embedding-3-small via LLM Proxy
- Tiered usage: Nano → Micro → Standard → Premium (never in hot path)

## Testing

- Vitest (unit + integration)
- Playwright (E2E)
- v8 coverage (80% minimum)
- MSW (Mock Service Worker) for API mocking

## DevOps

- Docker + Docker Compose (dev) / Kubernetes (prod)
- GitHub Actions (CI/CD)
- Pino (structured JSON logging)
- OpenTelemetry (distributed tracing)
- Grafana + Prometheus (monitoring)

## Package Manager

- pnpm (mandatory)

## Environments

- **Dev**: `CLUSTER_MODE=local`, Docker Compose, auto-discovery
- **Standalone**: single component, `.env` config or SQLite fallback
- **Production**: full tenant hierarchy, all dependencies explicit
