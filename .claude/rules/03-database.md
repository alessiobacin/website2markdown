---
description: Database rules — db-layer, Drizzle ORM, SQLite fallback, multi-tenant
alwaysApply: false
---

# 03 — DATABASE

## Database Access

V11 components access databases through two paths:

1. **db-layer** (infrastructure): cross-DB translation fabric — PostgreSQL, MSSQL, MySQL, MongoDB. Used by stores and services for domain data.
2. **Direct Drizzle ORM**: for components that own their schema and need tight control (e.g., KOS components use Drizzle directly for PostgreSQL).

For most components, use **Drizzle ORM** with PostgreSQL. The infrastructure resolution convention (`v11/conventions/INFRASTRUCTURE-RESOLUTION.md`) determines which database connection to use.

## Required Structure

- `services/` for business logic
- route handlers for HTTP I/O
- `lib/db/resolver.ts` for database resolution (db-layer vs SQLite)
- `lib/db/migrate.ts` for auto migrations

## Constraints

- Use Drizzle ORM for schema definition and queries
- Migrations managed via Drizzle migrations
- Input validation with Zod on all database inputs
- Frequent queries must have documented indexes
- SQLite fallback for standalone mode (see Infrastructure Resolution convention)

## Infrastructure Resolution

| Mode | DB_LAYER_URL set? | Database used |
|------|-------------------|---------------|
| Cluster (`CLUSTER_MODE=local`) | Any | Auto-discovery via Docker DNS |
| Standalone | Yes | Remote db-layer |
| Standalone | No | SQLite fallback (`data/component-name.sqlite`) |
| Production | Yes (required) | Remote db-layer |
| Production | No | **ERROR at startup** |

## Multi-tenant

This project is multi-tenant. Every resource belongs to a tenant.

- Every query MUST filter by `tenantId`
- Cross-tenant access only for platform service accounts
- Never expose one tenant's data to another tenant
- Tenant isolation enforced at query level and via db-layer authorization

## Data Protection (CRITICAL)

- **NEVER** run `DROP TABLE`, `TRUNCATE`, schema reset, or mass data deletion during development
- If a migration requires a breaking change (column rename, type change, field removal):
  1. Create an **additive** migration (ADD COLUMN → copy data → DROP old column)
  2. Use defaults for new required columns
  3. **ALWAYS** preserve existing data
- Migrations must be idempotent and reversible where possible
