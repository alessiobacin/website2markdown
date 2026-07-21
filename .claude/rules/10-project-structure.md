---
description: Folder map and actual project architecture
alwaysApply: true
---

# 10 — PROJECT STRUCTURE

## General Architecture

```
root/
├── src/                 Next.js source code (collocated unit tests `*.test.ts`)
├── gui/                 Optional: component GUI assets (@v11/design-system)
├── e2e/                 Playwright E2E tests
├── tests/integration/   API integration tests
├── docs/                Technical documentation and guides
├── data/                SQLite fallback database (standalone mode)
├── postman/             Postman collection
├── scripts/             Support scripts (seed, migration, build)
├── .planning/           GSD state, milestones, roadmap
├── design-system/       Design tokens and UI documents
├── public/              Static assets (images)
└── logs/                Application logs
```

## App Router (`src/app/`)

```
app/
├── (auth)/              Authentication route group
│   ├── login/
│   ├── signup/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── verify-email/
│   └── check-email/
├── (public)/            Public page route group
│   ├── <page-name>/     One folder per public page
│   └── .../
├── (dashboard)/         Protected/admin route group
│   └── admin/
│       ├── <entity>/    One folder per managed section
│       └── .../
├── api/                 API route handlers
│   ├── v1/              Versioned API (V11 mandatory)
│   │   ├── <entity>/    One handler per domain entity
│   │   └── .../
│   ├── auth/            Authentication (login, signup, refresh, logout)
│   ├── webhook/         Webhooks from external services
│   └── cron/            Scheduled jobs
├── docs/                Self-discovery endpoint (GET /docs)
│   └── route.ts
├── .well-known/
│   └── v11/
│       ├── discovery/   Machine-discovery alias
│       │   └── route.ts
│       └── gui/         GUI manifest (if GUI_ENABLED=true)
│           └── route.ts
├── health/              Health endpoint (GET /health)
│   └── route.ts
└── <protected-area>/    Areas reserved for specific roles
    └── dashboard/
```

## Component GUI (`gui/`) — Optional

If this component has a human-facing surface (config page, dashboard, chat interface), add a `gui/` folder:

```
gui/
├── README.md            Purpose, pages, security notes
├── manifest.json        Static copy of /.well-known/v11/gui response
├── src/                 Source code
│   ├── pages/           React page components
│   ├── components/      Component-specific UI elements
│   └── styles/          CSS Modules referencing --v11-* tokens
├── dist/                Built assets (git-ignored, built at deploy)
└── package.json         Dependencies: @v11/design-system
```

Rules:
- Import `@v11/design-system` for all tokens, components, layout
- Use CSS Modules with `--v11-*` custom properties — no hardcoded colors
- Toggle via `GUI_ENABLED=true` in `.env` (default: false)
- When disabled, `/.well-known/v11/gui` returns 404, no static assets served
- `manifest.json` declares: `componentId`, `version`, `role` (operator/tenant/both), `nav`, `pages`
- Auth via httpOnly cookie from identity-service — no JS-accessible JWT

See `v11/docs/26 - GUI-ARCHITECTURE.md` for full spec.

## Components (`src/components/`)

```
components/
├── ui/                  shadcn/ui + custom components (Button, Dialog, RichTextEditor...)
├── admin/               Admin components (forms, tables, editors)
├── layout/              Main layout (Navbar, Footer, Sidebar)
├── public/              Public page components
├── shared/              Components shared across areas
├── auth/                Login, signup, reset-password forms
├── <domain>/            One folder per functional domain
└── .../
```

## Libraries and Utilities (`src/lib/`)

```
lib/
├── db/
│   ├── resolver.ts      Database resolution (db-layer remote vs SQLite fallback)
│   └── migrate.ts       SQLite auto-migrations
├── events/              Event Bus integration (publish/subscribe)
├── cache/               Cache layer (Valkey/Redis)
├── ai/                  AI services (LLM via llm-proxy, embeddings)
├── auth/                Auth config, JWT utilities
├── email/               Email client + templates
│   └── templates/
├── validation/          Zod schemas
├── <integration>/       External integrations (e.g., stripe, calendar, analytics...)
├── hooks/               Shared hooks
├── utils/               Generic utilities
└── <domain>/            Domain-specific modules
```

## Database (`src/db/`)

```
db/
├── schema.ts            Drizzle ORM schema definitions
├── migrations/          Drizzle migration files
├── index.ts             Drizzle client initialization
└── seed.ts              Seed data for development
```

## Other Folders in `src/`

```
src/
├── services/            Complex business logic (`<entity>.service.ts`)
├── types/               TypeScript type definitions (`<domain>.ts`)
├── contexts/            React contexts
└── hooks/               Custom React hooks
```

## Placement Conventions

- New API endpoint → `src/app/api/v1/<entity>/route.ts` (versioned!)
- New complex logic → `src/services/<entity>.service.ts`
- Database schema → `src/db/schema.ts` (Drizzle)
- Database resolver → `src/lib/db/resolver.ts` (db-layer vs SQLite)
- Event Bus integration → `src/lib/events/<domain>.events.ts`
- New public page → `src/app/(public)/<name>/page.tsx`
- New admin page → `src/app/(dashboard)/admin/<name>/page.tsx`
- New UI component → `src/components/ui/<ComponentName>.tsx`
- New feature component → `src/components/<domain>/<ComponentName>.tsx`
- New TS type → `src/types/<domain>.ts`
- New hook → `src/hooks/use-<name>.ts`
- New unit test → collocated next to source: `<file>.test.ts(x)`
- New integration test → `tests/integration/<name>.test.ts`
- New E2E test → `e2e/<name>.spec.ts`
- New DB migration → `src/db/migrations/` (Drizzle managed)
- New technical document → `docs/<category>/<name>.md`
- SQLite fallback data → `data/<component-name>.sqlite`
- New GUI page → `gui/src/pages/<PageName>.tsx` (uses @v11/design-system)
- GUI manifest → `gui/manifest.json` + `src/app/.well-known/v11/gui/route.ts`
