---
description: Modules Platform V11 architecture compliance — every component built from this template is a V11 module
alwaysApply: true
---

# 14 — MODULES PLATFORM (V11) COMPLIANCE

This project is a component of **Modules Platform V11** — an orchestrated multi-module system governed by a persistent control plane. Every component built from this template MUST comply with V11 architecture, conventions, and contracts.

V11 authoritative documentation lives at: `/Users/alessiobacin/Documents/Claude/Projects/Modules Platform/v11/`

When in doubt, read the relevant V11 doc before making decisions.

---

## V11 Architecture Overview

V11 is a platform governed by:

- **Control Plane**: Discovery Engine (n=10), Orchestrator Agent (n=16), Promotion Engine (n=14), Creator Block (n=15)
- **KOS (Knowledge Operating System)**: brain-inspired memory backbone — knowledge-os-service (n=47), knowledge-planner-agent (n=71), consolidation-agent (n=72), capability-discovery-service (n=73), benchmark-engine (n=74), communication-sync-service (n=75). Storage: Valkey (working memory), PostgreSQL (episodic/semantic), Qdrant (vector search), Neo4j CE (knowledge graph)
- **Service Layer**: persistent shared services (identity-service n=25, notification-service n=30, billing-service n=41, telemetry-service n=60, agent-evolution-service n=77, approval-service n=58, etc.)
- **Agent Layer**: persistent documented agents with stable responsibilities (builder-agent n=17, debugger-agent n=21, brand-guardian-agent n=24, capability-provisioner-agent n=76, etc.)
- **Store Layer**: data boundary services (asset-store, brief-store, telemetry-store, project-state-store, audit-store, memory-store, etc.)
- **Gateway Layer**: llm-proxy (n=45), auth-gateway (n=52), routing-proxy (n=64), storage-gateway (n=53), notification-gateway (n=54), payment-gateway (n=55)
- **Infrastructure**: db-layer (cross-DB fabric), event-bus (Redis Streams), cache (Valkey/Redis), object-store (S3-compatible MinIO)
- **Runtime**: execution-runtime, dynamic-agent-composer (n=81)
- **GUI Layer**: shared design system + dual shell apps (Operator Console + Tenant Workspace) — see GUI section below

### Core Flow

```
Goal → Discovery Engine (grillme interview) → GoalContract → Orchestrator → Research/Registry →
Build decision → Runtime execution → Monitoring → Promotion
```

### Discovery and Grillme Protocol

The intake flow uses the **grillme protocol** (via `goal-interview-skill`):

1. Discovery Engine queries **KOS directly** (not via Orchestrator — it works upstream) to pre-load existing context (tenant profile, client preferences, previous briefs, active procedures, project history)
2. `goal-interview-skill` analyzes what's still unknown and generates only questions that KOS couldn't answer
3. Convergence-based interview via WebSocket: tracks `confidenceScore`, `fieldsResolved`, `fieldsRemaining`
4. Convergence when `confidenceScore ≥ 0.9 AND userConfirmed` (user confirms the reformulation)
5. Zero-question convergence is valid if KOS context is rich enough
6. Grillme auto-regulates depth: simple tasks converge in 1-2 turns, complex ones may take 8-10
7. Output: structured `GoalContract` written to `brief-store`

### Tenant Hierarchy

```
Platform → Tenant/Agency → Client → Project
```

Every data query filters by the appropriate scope level. See `v11/conventions/TENANT-HIERARCHY.md`.

### Component Types

| Type | Location | Module Numbers | Examples |
|------|----------|---------------|---------|
| Control Plane | `control-plane/` | Yes | discovery-engine (10), orchestrator-agent (16) |
| Agent | `agents/` | Yes (if network-exposed) | builder-agent (17), consolidation-agent (72) |
| Service | `services/` | Yes | knowledge-os-service (47), identity-service (25) |
| Store | `stores/` | No | asset-store, brief-store, memory-store |
| Gateway | `gateways/` | Yes | llm-proxy (45), routing-proxy (64) |
| Skill | `capabilities/skills/` | No | goal-interview-skill, copywriting-skill |
| Tool | `capabilities/tools/` | No | data-ingestion-tool |
| MCP | `capabilities/mcp/` | No | github-mcp-server |
| Infrastructure | `infrastructure/` | No (except event-bus n=48) | db-layer, cache, object-store |
| Runtime | `runtime/` | Yes | dynamic-agent-composer (81) |
| GUI | `gui/` | No | shared-design-system, operator-console, tenant-workspace |
| Procedure | `control-plane/procedures/` | No | work modes, playbooks, policies |

---

## Mandatory Requirements for Every V11 Component

### 1. Module Number and Port Allocation

Every persistent network-exposed component MUST have a stable module number `n`.

| Environment | Port Formula |
|-------------|-------------|
| Development | `5000 + n` |
| Staging | `6000 + n` |
| Production | `7000 + n` |

Before starting, check `v11/docs/06 - MODULE-NUMBERING.md` for the next available number. Register the new number there.

Components that do NOT get module numbers: stores, skills, tools, MCP integrations, CLI integrations, procedures, GUI shared assets (design system, shell apps).

### 2. Self-Discovery Endpoints (CRITICAL)

Every HTTP-exposed component MUST implement:

```
GET /docs                          → Self-discovery contract (JSON)
GET /.well-known/v11/discovery     → Stable alias (same payload or redirect)
GET /health                        → Health check with dependency status
```

The `/docs` endpoint must return a structured JSON following the contract defined in `v11/conventions/DOCS-ENDPOINT-STANDARD.md`. It must include: component identity, narrative, interaction details, endpoint inventory with examples, recommended flows, events, dependencies, configuration, health, and LLM guidance.

### 3. GUI Auto-Discovery Endpoint (if GUI-enabled)

If the component ships a GUI (`GUI_ENABLED=true` in `.env`), it MUST also expose:

```
GET /.well-known/v11/gui           → GUI manifest (JSON)
```

Returning:

```json
{
  "componentId": "<component-slug>",
  "version": "<semver>",
  "role": "operator | tenant | both",
  "nav": {
    "label": "<Display Name>",
    "icon": "<icon-name from shared icon set>",
    "order": 10,
    "section": "core | data | operations | settings"
  },
  "pages": [
    {
      "path": "/<route-path>",
      "title": "<Page Title>",
      "type": "full-page | modal | panel",
      "entryPoint": "/gui/dist/index.html",
      "default": true
    }
  ],
  "assets": "/gui/dist/"
}
```

When `GUI_ENABLED=false` (default), the component returns 404 for `/.well-known/v11/gui` and does not serve GUI assets.

See `v11/docs/26 - GUI-ARCHITECTURE.md` for the full GUI architecture.

### 4. API Versioning

All API routes MUST be versioned:

```
src/app/api/v1/...
```

Path pattern: `/api/v1/{resource}` — REST style, kebab-case resources.

### 5. Multi-Tenancy

Every component MUST be tenant-aware:

- Every query MUST filter by `tenantId`
- Every API request context includes `tenantId`
- Data isolation enforced at all layers
- Cross-tenant access only for platform service accounts
- Tenant hierarchy: Platform → Tenant/Agency → Client → Project
- See `v11/docs/16 - MULTI-TENANCY.md` for full spec

### 6. Event Bus Integration

Every component MUST document and implement Event Bus integration:

- **Emitted events**: what events this component publishes
- **Consumed events**: what events this component subscribes to
- Event naming convention: `{domain}.{entity}.{action}` (e.g., `knowledge.gap.detected`)
- Internal module-to-module state propagation → Event Bus (not direct REST)
- See `v11/conventions/DEPENDENCY-FAILURE-NOTIFICATION.md` for failure handling

Decision rule:

| Pattern | Channel |
|---------|---------|
| Internal state propagation | Event Bus |
| Synchronous command/query | REST |
| Async external callback | Webhook |
| Live user interaction | WebSocket |

### 7. Infrastructure Resolution

Follow `v11/conventions/INFRASTRUCTURE-RESOLUTION.md`:

- **Cluster mode** (`CLUSTER_MODE=local`): automatic discovery via Docker DNS. Zero `.env` config needed.
- **Non-cluster mode**: every dependency explicitly configured in `.env`
- **SQLite fallback**: if `DB_LAYER_URL` not set and not in cluster mode → use `better-sqlite3` locally
- Include `src/lib/db/resolver.ts` for database resolution abstraction

### 8. Dependency Failure Handling

Follow `v11/conventions/DEPENDENCY-FAILURE-NOTIFICATION.md`:

- `/health` endpoint MUST report status of every dependency
- Graceful degradation when optional dependencies are unavailable
- Dependencies declared in README and self-discovery contract

### 9. Documentation Requirements

Every V11 component MUST have:

| Document | Purpose |
|----------|---------|
| `README.md` | What it is, why it exists, dependencies, consumers, status |
| `TECHNICAL-SPEC.md` | Full technical spec: objects, API, workflows, data model, events, failure modes |
| `REAL-LIFE-EXAMPLES.md` | Practical usage scenarios (minimum 3) |
| `Dockerfile` | Containerization |
| `docker-compose.yml` | Local dev with dependencies |

### 10. Registry Compliance

After creating the component:

1. Add to the appropriate category registry (`services/SERVICE-REGISTRY.md`, `agents/AGENT-REGISTRY.md`, etc.)
2. Add to `v11/docs/07 - CAPABILITY-REGISTRY.md`
3. Add to `v11/docs/06 - MODULE-NUMBERING.md`
4. Add to `v11/docs/08 - BOOTSTRAP-ORDER.md` if it affects build order
5. Update `v11/docs/02 - README.md` structure if adding a new folder

---

## GUI Layer

V11 includes a GUI layer with a shared design system and dual shell apps. See `v11/docs/26 - GUI-ARCHITECTURE.md` for the full spec.

### Shared Design System (`gui/shared-design-system/`)

All component GUIs import `@v11/design-system` — a standalone package providing:

- **CSS tokens**: colors, spacing, radii, shadows, breakpoints, z-index — as `--v11-*` custom properties
- **Typography**: Inter font stack, type scale (12-40px), weights
- **Component library**: Button, Input, Select, Modal, Table, Card, Badge, Toast, Nav, ChatBubble, Avatar, Spinner, Breadcrumb, Tabs, EmptyState
- **Icons**: SVG sprite set, React `<Icon>` wrapper
- **Shell layout**: header + sidebar + content area, responsive breakpoints
- **Theme**: light/dark via `data-theme` attribute

Token naming: `--v11-color-primary`, `--v11-space-md`, `--v11-text-lg`, `--v11-radius-md`, etc.

Components use **CSS Modules** that reference tokens. No hardcoded colors, no inline styles.

### Dual Shell Apps

| Shell | URL | Roles | Entry Point |
|-------|-----|-------|-------------|
| **Operator Console** (`gui/operator-console/`) | `admin.v11.example.com` | `platform_admin`, `agency_admin` | Telemetry dashboard |
| **Tenant Workspace** (`gui/tenant-workspace/`) | `app.v11.example.com` | `account-manager`, `operator`, `viewer` | Discovery chat (grillme) |

Both shells discover active component GUIs at runtime via `GET /.well-known/v11/gui` and dynamically build navigation. No monolith frontend — each component owns its own pages.

### Per-Component GUI Convention

Components with a human-facing surface MAY ship a `gui/` folder:

```
component-name/
├── gui/
│   ├── README.md           ← purpose, pages, security notes
│   ├── src/                ← source (React 19, CSS Modules, @v11/design-system)
│   ├── dist/               ← built assets (git-ignored)
│   └── manifest.json       ← static copy of /.well-known/v11/gui response
```

Toggle via `.env`:

```env
GUI_ENABLED=true       # default: false
GUI_THEME=light        # default: from design system
GUI_BASE_PATH=/        # default: /
```

### Components That Get GUIs

Not all components need GUIs. Typical GUI-enabled components: identity-service, discovery-engine, knowledge-os-service, orchestrator-agent, telemetry-service, billing-service, routing-proxy, approval-service, notification-service, compliance-service, policy-service, publishing-service, asset-store.

Infrastructure (db-layer, event-bus, cache, object-store) do NOT get GUIs.

### GUI Security

- Authentication via `identity-service` — httpOnly cookie JWT
- No JWT exposed to JavaScript, no localStorage tokens
- Shell reads JWT `roles` claim to determine which shell and which nav items to show
- Component GUIs communicate with their own API at their own port
- Cross-component data sharing via shell client-side event bus (`window.v11.emit()` / `window.v11.on()`)

### User Flow (Tenant Workspace)

```
Login → identity-service (httpOnly cookie)
  → Discovery chat (grillme interview via WebSocket)
    → GoalContract finalized
      → Project dashboard (execution progress, real-time)
        → Asset review → Approve → Done
```

### User Flow (Operator Console)

```
Login → identity-service (httpOnly cookie, admin role)
  → System dashboard (telemetry)
    → Navigate to component config pages (auto-discovered)
```

---

## V11 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.x App Router |
| Language | TypeScript 5.x strict mode |
| Runtime | Node.js 22 LTS+ |
| Validation | Zod |
| ORM | Drizzle |
| Database | PostgreSQL (via db-layer), SQLite fallback |
| Local fallback | SQLite (better-sqlite3) |
| Caching | Redis / Valkey |
| Vector DB | Qdrant (for KOS) or pgvector |
| Graph DB | Neo4j CE (for KOS) |
| Object Storage | MinIO (S3-compatible) |
| Event Bus | Redis Streams (MVP) → NATS JetStream (scale) |
| Auth | JWT (jose), Argon2 |
| Testing | Vitest + Playwright |
| UI | Tailwind CSS + shadcn/ui (app pages), `@v11/design-system` (component GUIs) |
| Design System | CSS custom properties (`--v11-*`) + CSS Modules + React component library |
| State | React Query (server) + Zustand (client) |
| LLM SDK | Vercel AI SDK |
| Logging | Pino (structured JSON) |
| Tracing | OpenTelemetry |
| Deployment | Docker + Docker Compose (dev) / Kubernetes (prod) |
| Package manager | pnpm |

### LLM Tiering (for components that use LLMs)

| Tier | Models | Use |
|------|--------|-----|
| Nano | Rules/templates, $0 | <1ms, 80% of cases |
| Micro | GPT-4o-mini / Haiku | ~200ms, classification, extraction |
| Standard | GPT-4o / Sonnet | ~1s, reasoning, planning |
| Premium | o1 / Opus | Never in hot path |

All LLM calls go through `gateways/llm-proxy` (n=45). No direct provider SDK calls from components.

### Tool Selection Convention

CLI tools are preferred over MCP servers. See `v11/conventions/TOOL-SELECTION.md`:
- If a CLI exists for the external system → USE CLI
- MCP only as fallback when no CLI alternative exists

---

## KOS Integration

If this component produces or consumes knowledge, it must integrate with KOS:

### As a KOS Consumer (reads knowledge)
- Call `knowledge-planner-agent` (n=71) to get a retrieval plan
- Execute the plan via `knowledge-os-service` (n=47)
- Or use direct semantic query: `POST /v1/memory/query`
- Discovery Engine has a special privilege: it queries KOS directly (upstream of Orchestrator)

### As a KOS Producer (creates knowledge)
- Emit events that KOS consumes (e.g., `{domain}.{entity}.completed`)
- KOS stores incoming data as episodic memory with decay
- Nightly consolidation promotes important data to semantic memory

### Memory Categories (16 types)
`working`, `episodic`, `problem`, `solution`, `procedure`, `procedure_run`, `decision`, `architecture`, `pattern`, `project`, `domain`, `relationship`, `experience`, `learning`, `antipattern`, `confidence`

### Capability Scoring
KOS scores capabilities using: `0.4 × reliability + 0.3 × freshness + 0.3 × relevance`

---

## Standard Project Structure (V11 component)

```
component-name/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
├── src/
│   ├── app/
│   │   ├── api/v1/           ← Versioned API routes
│   │   │   ├── {resource}/route.ts
│   │   │   └── ...
│   │   ├── docs/route.ts     ← Self-discovery endpoint
│   │   ├── health/route.ts   ← Health check
│   │   └── .well-known/
│   │       └── v11/
│   │           ├── discovery/route.ts  ← Machine-discovery alias
│   │           └── gui/route.ts        ← GUI manifest (if GUI_ENABLED)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── resolver.ts   ← db-layer vs SQLite resolution
│   │   │   └── migrate.ts    ← Auto migrations
│   │   ├── events/           ← Event Bus integration
│   │   ├── cache/            ← Cache layer
│   │   └── validation/       ← Zod schemas
│   ├── services/             ← Business logic (*.service.ts)
│   ├── types/                ← TypeScript definitions
│   └── test/                 ← Test utilities
├── gui/                      ← Optional: GUI assets (if component has human-facing surface)
│   ├── README.md
│   ├── src/                  ← React 19, CSS Modules, @v11/design-system
│   ├── dist/                 ← Built assets (git-ignored)
│   └── manifest.json         ← Static copy of /.well-known/v11/gui
├── data/                     ← SQLite fallback directory
│   └── .gitkeep
├── docs/
│   └── architecture/         ← ADR, diagrams
├── e2e/                      ← Playwright tests
├── postman/                  ← API collections
├── scripts/                  ← Automation scripts
├── README.md                 ← V11 component README
├── TECHNICAL-SPEC.md         ← Full technical spec
├── REAL-LIFE-EXAMPLES.md     ← Usage scenarios
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Coding Patterns Specific to V11

### Service pattern

```typescript
// src/services/gap-analysis.service.ts
import { z } from 'zod';

const AnalyzeSchema = z.object({
  tenantId: z.string(),
  scopeId: z.string(),
  targetFields: z.array(z.string()).optional(),
});

export class GapAnalysisService {
  async analyze(input: z.infer<typeof AnalyzeSchema>) {
    const validated = AnalyzeSchema.parse(input);
    // Business logic here — never in route handlers
  }
}
```

### Route handler pattern

```typescript
// src/app/api/v1/gaps/analyze/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GapAnalysisService } from '@/services/gap-analysis.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = new GapAnalysisService();
    const result = await service.analyze(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Event emission pattern

```typescript
// src/lib/events/emitter.ts
import { eventBus } from '@/lib/events/bus';

export async function emitEvent(event: string, payload: Record<string, unknown>) {
  await eventBus.publish(event, {
    ...payload,
    timestamp: new Date().toISOString(),
    source: process.env.COMPONENT_SLUG,
  });
}
```

### GUI manifest route (for GUI-enabled components)

```typescript
// src/app/.well-known/v11/gui/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.GUI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'GUI not enabled' }, { status: 404 });
  }

  return NextResponse.json({
    componentId: process.env.COMPONENT_SLUG,
    version: process.env.npm_package_version || '0.0.0',
    role: 'tenant', // or 'operator' or 'both'
    nav: {
      label: 'Component Name',
      icon: 'box',
      order: 50,
      section: 'core',
    },
    pages: [
      {
        path: '/' + process.env.COMPONENT_SLUG,
        title: 'Main Page',
        type: 'full-page',
        entryPoint: '/gui/dist/index.html',
        default: true,
      },
    ],
    assets: '/gui/dist/',
  });
}
```

---

## V11 Key Documents Reference

When working on a component, these are the authoritative docs to consult:

| Document | Path | When to read |
|----------|------|-------------|
| Platform overview | `v11/docs/02 - README.md` | Starting any component |
| Architecture map | `v11/docs/03 - ARCHITECTURE.md` | Understanding component relationships |
| Module numbering | `v11/docs/06 - MODULE-NUMBERING.md` | Assigning ports |
| Capability registry | `v11/docs/07 - CAPABILITY-REGISTRY.md` | Registering a new component |
| Bootstrap order | `v11/docs/08 - BOOTSTRAP-ORDER.md` | Understanding startup dependencies |
| Request lifecycle | `v11/docs/09 - REQUEST-LIFECYCLE.md` | Understanding the full request flow |
| Orchestrator detail | `v11/docs/12 - ORCHESTRATOR.md` | Building control-plane components |
| Execution runtime | `v11/docs/14 - EXECUTION-RUNTIME.md` | Building runtime/agent components |
| Multi-tenancy | `v11/docs/16 - MULTI-TENANCY.md` | Implementing tenant isolation |
| Security/auth | `v11/docs/18 - SECURITY-AUTH.md` | Implementing auth, roles, JWT |
| Dev stack | `v11/docs/21 - DEVELOPMENT-STACK.md` | Tech stack decisions |
| Metacognition | `v11/docs/24 - METACOGNITION.md` | Building agents with self-awareness |
| Conventions | `v11/docs/25 - CONVENTIONS.md` | Cross-cutting standards |
| **GUI architecture** | `v11/docs/26 - GUI-ARCHITECTURE.md` | **Building GUIs, design system, auto-discovery** |
| Docs endpoint standard | `v11/conventions/DOCS-ENDPOINT-STANDARD.md` | Implementing /docs |
| Infrastructure resolution | `v11/conventions/INFRASTRUCTURE-RESOLUTION.md` | DB/cache resolution |
| Dependency failure | `v11/conventions/DEPENDENCY-FAILURE-NOTIFICATION.md` | Health endpoint, degradation |
| Tenant hierarchy | `v11/conventions/TENANT-HIERARCHY.md` | Scope levels |
| Tool selection | `v11/conventions/TOOL-SELECTION.md` | CLI vs MCP decisions |
| Deploy handshake | `v11/conventions/DEPLOY-ACCESS-HANDSHAKE.md` | Component registration at startup |

### E2E Examples (for understanding real data flow)

| Resource | Path | Purpose |
|----------|------|---------|
| Main scenario | `v11/e2e-examples/main-scenario.md` | Full Pasta Rustichella LinkedIn post trace |
| Per-component deep-dives | `v11/e2e-examples/components/*.md` | Same scenario from each component's perspective |
| Orchestration flow (docx) | `v11/e2e-examples/V11-Orchestration-Flow-Example.docx` | HACCP campaign through 11 steps |
| Enterprise MSSQL scenario | `v11/e2e-examples/scenarios/scenario-2-enterprise-mssql.md` | Cross-DB via db-layer |
| Research dossier scenario | `v11/e2e-examples/scenarios/scenario-3-research-dossier.md` | Research-heavy flow |

### Category Registries

| Registry | Path |
|----------|------|
| Agents | `v11/agents/AGENT-REGISTRY.md` |
| Services | `v11/services/SERVICE-REGISTRY.md` |
| Stores | `v11/stores/STORE-REGISTRY.md` |
| Gateways | `v11/gateways/GATEWAY-REGISTRY.md` |
| Skills | `v11/capabilities/skills/SKILL-REGISTRY.md` |
| Tools | `v11/capabilities/tools/TOOL-REGISTRY.md` |
| MCP | `v11/capabilities/mcp/MCP-REGISTRY.md` |
| CLIs | `v11/capabilities/clis/CLI-REGISTRY.md` |
| Procedures | `v11/control-plane/procedures/PROCEDURE-REGISTRY.md` |
| Capabilities (unified) | `v11/capabilities/CAPABILITY-CATALOG.md` |

---

## Checklist: Before Declaring a Component Complete

### Core compliance
- [ ] Module number assigned and registered in `06 - MODULE-NUMBERING.md`
- [ ] `/docs` endpoint returns full self-discovery contract
- [ ] `/.well-known/v11/discovery` alias works
- [ ] `/health` endpoint reports all dependency statuses
- [ ] All API routes under `/api/v1/`
- [ ] Every query filters by `tenantId`
- [ ] Event Bus events documented (emitted + consumed)
- [ ] Infrastructure resolution follows convention (cluster/standalone/SQLite)
- [ ] README.md, TECHNICAL-SPEC.md, REAL-LIFE-EXAMPLES.md written
- [ ] Dockerfile and docker-compose.yml present
- [ ] Registered in appropriate category registry
- [ ] Added to CAPABILITY-REGISTRY.md
- [ ] Added to BOOTSTRAP-ORDER.md if relevant

### Code quality
- [ ] Zod validation on all inputs
- [ ] TypeScript strict, zero `any`
- [ ] Tests pass (unit + integration + E2E where applicable)
- [ ] Pino structured logging
- [ ] OpenTelemetry tracing

### GUI (if applicable)
- [ ] `GUI_ENABLED` toggle in `.env`
- [ ] `/.well-known/v11/gui` returns valid manifest when enabled, 404 when disabled
- [ ] GUI uses `@v11/design-system` tokens and components
- [ ] `gui/` folder with README, src, manifest.json
- [ ] `role` field correctly set (`operator`, `tenant`, or `both`)
- [ ] Pages render correctly inside shell layout
- [ ] Auth via httpOnly cookie (no JS-accessible tokens)
