---
description: Catalog of skills available for Claude Code — consult when a specific skill is needed or alternative approaches are being evaluated
alwaysApply: false
---

# 07 — SKILLS

## Operating Rule

- use available skills and commands before introducing alternative workflows
- stay aligned with `.planning/` and the active GSD state
- when a curated project CLI is used for the first time, load the corresponding local skill from `.claude/skills/` first

## Local Project Skills

### Curated CLIs

- `playwright-cli` — token-efficient browser automation via CLI
- `gh-cli` — GitHub workflow via `gh`
- `postman-cli` — collection runs, smoke tests, and API governance via `postman`
- `claude-cli` — sessions, subagents, MCP, and automation via `claude`
- `docker-cli` — compose, containers, and local runtime via `docker`
- `graphify` — repository knowledge-graph build and query workflows via `graphify`

## Available Skills (`skills.sh`)

### Stack / Next.js / React

- `vercel-labs/agent-skills@vercel-react-best-practices` — best practices React/Next.js
- `wshobson/agents@tailwind-design-system` — Tailwind CSS / shadcn/ui
- `anthropics/skills@frontend-design` — UI design
- `nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max` — advanced UX/UI

### Backend / API

- `wshobson/agents@nodejs-backend-patterns` — backend Node.js/TS
- `wshobson/agents@api-design-principles` — consistent API design
- `wshobson/agents@auth-implementation-patterns` — auth/JWT

### Database / ORM

- Drizzle ORM for PostgreSQL schema and migrations (via db-layer or direct)
- better-sqlite3 for SQLite fallback in standalone mode
- No Supabase — V11 uses db-layer as cross-DB translation fabric

### Testing

- `mattpocock/skills@tdd` — TDD cycle
- `am-will/codex-skills@tdd-test-writer` — test-first writing
- `currents-dev/playwright-best-practices-skill@playwright-best-practices` — E2E Playwright
- `anthropics/skills@webapp-testing` — testing UI
- `wshobson/agents@e2e-testing-patterns` — E2E patterns

### Documentation / Postman

- `supercent-io/skills-template@api-documentation` — API documentation
- `github/awesome-copilot@documentation-writer` — technical writing
- `postman-devrel/agent-skills@postman` — collection Postman
- `postman-devrel/agent-skills@postman-api-readiness` — quality gate API

### Git

- `supercent-io/skills-template@git-workflow` — Git workflow
- `github/awesome-copilot@git-commit` — commit message
- `github/awesome-copilot@conventional-commit` — conventional commits

### Docker / Deploy

- `sickn33/antigravity-awesome-skills@docker-expert` — Docker/containerization
- `josiahsiegel/claude-plugin-marketplace@docker-platform-guide` — cross-platform Docker guide

### MCP / Tooling

- `anthropics/skills@mcp-builder` — MCP integrations
- `github/awesome-copilot@mcp-cli` — CLI MCP
- `upstash/context7@documentation-lookup` — live docs via Context7
- `am-will/codex-skills@context7` — technical documentation lookup

### Quality

- `wshobson/agents@code-review-excellence` — code review
