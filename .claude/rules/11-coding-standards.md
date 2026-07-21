---
description: Naming, error handling, API patterns, and UI rules
alwaysApply: true
---

# 11 — CODING STANDARDS

**These rules apply ONLY to new code.** Do not rename, restructure, or correct existing files just to conform. Refactoring happens only on explicit request.

## Naming conventions

| Context | Format | Example |
|----------|---------|---------|
| Route Handler | `route.ts` in a kebab-case folder | `api/v1/resolved-cases/route.ts` |
| Page | `page.tsx` in a kebab-case folder | `(public)/about-us/page.tsx` |
| Layout | `layout.tsx` | `(dashboard)/layout.tsx` |
| React components | PascalCase + `.tsx` | `ArticleCard.tsx` |
| shadcn/ui components | kebab-case + `.tsx` | `button.tsx`, `dialog.tsx` |
| Business service | kebab-case + `.service.ts` | `articles.service.ts`, `obsolescence.service.ts` |
| DB schema | `schema.ts` | `src/db/schema.ts` |
| Event handler | kebab-case + `.events.ts` | `article.events.ts` |
| Hook | `use-` + kebab-case + `.ts` | `use-toast.ts` |
| TS types | kebab-case + `.ts` | `article.ts`, `calendar.ts` |
| Lib/utility | kebab-case + `.ts` | `tenant-handler.ts` |
| Test | kebab-case + `.test.ts` o `.spec.ts` | `articles.service.test.ts` |
| DB migration | Drizzle-managed in `src/db/migrations/` | auto-generated |

## Pattern API response (Route Handlers)

- Success: `NextResponse.json(data)` (GET), `NextResponse.json(created, { status: 201 })` (POST), `NextResponse.json({ message: '...' })` (actions)
- Error: `NextResponse.json({ error: '...' }, { status: 4xx/5xx })` — use the appropriate status code (400, 401, 403, 404, 500)
- All API routes MUST be under `/api/v1/` (V11 versioning convention)

## Error Handling in Route Handlers

- Every async route handler MUST have `try/catch` with a `{ status: 500 }` fallback
- Follow the pattern of existing route handlers in the codebase (in-context learning)

## Input Validation

- ALWAYS validate with **zod** (`safeParse` + return 400 on failure)
- Never trust the client: verify permissions and ownership server-side
- Follow existing route-handler patterns in the codebase; if the project is new, refer to the active GSD state, `.planning/`, or the nearest existing implementation

## TypeScript

- `strict: true` — zero `any`, zero `@ts-ignore`
- Always type function parameters and return values
- Use `interface` for domain objects and `type` for unions/utilities
- Prefer `unknown` over `any` in `catch` blocks

## React / Next.js

- Initial rendering should remain server-side whenever possible; the browser should not do avoidable work
- Prefer **Server Components** (default in App Router)
- Use `'use client'` only when necessary (interactivity, hooks, event handlers)
- For public pages or cacheable content prefer **SSG/ISR**; for request-specific, auth-gated, or tenant-specific data prefer **SSR**
- Do not use `useEffect` for initial data fetching — use Server Components, server-side fetches, or React Query only for truly client-side state
- Keep `'use client'` as low in the component tree as possible to reduce bundle size and hydration
- Local state with `useState`/`useReducer`, global state with React Context or Zustand
- Memoize with `useMemo`/`useCallback` only when there is a real performance issue

## UI — Binding Rules

- Never use browser `alert()`, `confirm()`, or `prompt()`
- Always use shadcn/ui components: `AlertDialog` for confirmations, `Dialog` for modals, `Sonner/Toast` for notifications
- Keep styling consistent with Tailwind CSS — no inline CSS, no `style={{}}`
- Accessible components: `aria-*` attributes, keyboard navigation, color contrast

## Database (db-layer / Drizzle)

- Database resolution via `src/lib/db/resolver.ts` — determines db-layer remote vs SQLite fallback
- Schema definitions with Drizzle ORM in `src/db/schema.ts`
- Every table MUST include `tenantId` column for multi-tenancy
- Business logic in `src/services/<entity>.service.ts` — one file per entity
- Complex logic crossing multiple entities goes in `src/services/`
- Never expose database credentials client-side
- Migrations managed by Drizzle Kit (`drizzle-kit generate` / `drizzle-kit migrate`)

## Event Bus Integration

- Event emission via `src/lib/events/` — publish domain events after state changes
- Event naming: `{domain}.{entity}.{action}` (e.g., `articles.article.created`)
- Events are fire-and-forget — do not block request handling on event delivery
- Subscribe to events in dedicated handler files

## Available Skills (`skills.sh`)

- `vercel-labs/agent-skills@vercel-react-best-practices` — best practices React/Next.js
- `wshobson/agents@tailwind-design-system` — Tailwind CSS / shadcn/ui
- `wshobson/agents@api-design-principles` — consistent API design
- `wshobson/agents@code-review-excellence` — code review
