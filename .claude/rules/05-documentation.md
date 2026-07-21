---
description: Documentation rules for README, Postman, self-discovery, and docs/ — read when creating or modifying documentation, API endpoints, or Postman collections
alwaysApply: false
---

# 05 — DOCUMENTATION

## V11 Documentation Triple (Mandatory)

Every V11 component MUST have these three documents:

1. **`README.md`** — purpose, dependencies, consumers, configuration, related links
2. **`TECHNICAL-SPEC.md`** — detailed technical specification (API contracts, data models, event schemas, workflows)
3. **`REAL-LIFE-EXAMPLES.md`** — concrete usage scenarios with request/response examples

## Mandatory README

If `README.md` does not exist, create it immediately.

Minimum contents:

- what the component is (purpose statement)
- dependencies (other V11 components this depends on)
- consumers (who calls this component)
- configuration (env vars without secrets)
- module number and ports (dev/staging/prod)
- related links (registry, technical spec)

## Self-Discovery Endpoint (V11 Mandatory)

Every HTTP-exposed V11 component MUST implement:

- `GET /docs` — canonical self-discovery endpoint (structured JSON)
- `GET /.well-known/v11/discovery` — stable machine-discovery alias

This is the **primary API documentation** for V11 components. It must contain: component identity, narrative, interaction details, full endpoint inventory with examples, recommended flows, events, dependencies, configuration, health, and LLM guidance.

See `conventions/DOCS-ENDPOINT-STANDARD.md` for the complete specification.

## `docs/` Folder (CRITICAL)

All explanatory Markdown files and technical documentation must live in the `docs/` folder at the project root.

```
docs/
├── architecture/        Architecture documents
├── guides/              Development guides
├── adr/                 Architecture Decision Records
└── notes/               Technical notes and working notes
```

- **DO NOT create explanatory `.md` files** scattered in the root or other project folders
- Allowed exceptions: `README.md`, `TECHNICAL-SPEC.md`, `REAL-LIFE-EXAMPLES.md`, `CLAUDE.md` (root)
- If a documentation `.md` file already exists elsewhere, move it into `docs/`

## Postman Collection

For every created or modified endpoint:

- `postman/collection.json` aggiornato
- `dev`, `staging`, `prod` environments
- complete request definition (headers/body/query)
- environment variables
- auth if applicable
- basic tests (status code + response shape)

Note: the `/docs` self-discovery endpoint is the primary API documentation source; Postman collections complement it for interactive testing.

## Available Skills (`skills.sh`)

- `supercent-io/skills-template@api-documentation` — API documentation
- `github/awesome-copilot@documentation-writer` — technical writing
- `postman-devrel/agent-skills@postman` — collection Postman
- `postman-devrel/agent-skills@postman-api-readiness` — quality gate API
