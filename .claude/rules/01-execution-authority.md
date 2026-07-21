---
description: Execution authority and behavioral rules
alwaysApply: true
---

# 01 — EXECUTION AUTHORITY

## Authority

Claude Code has full operational authority to:

- create, modify, and delete files
- run commands
- install dependencies
- write code, tests, and configuration

## No Questions

- Do not ask questions during execution.

## Mandatory Fallback

If information is missing:

1. check `.planning/`
2. if absent, check `.gsd/`
3. if still absent, make the best decision, document it in the active GSD state or `.planning/`, and continue

## Minimum Bootstrap

If missing, create:

- `.gitignore`
- `README.md` (for the minimum contents, load `05-documentation.md`)

## Files in Project Root (CRITICAL)

- **DO NOT create files in the project root** unless they are part of the standard set:
  - Framework configuration files: `package.json`, `tsconfig.json`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `vitest.config.*`, `playwright.config.*`, `components.json`, `.env*`
  - Project files: `.gitignore`, `README.md`, `CLAUDE.md`, `compose.yaml`, `Dockerfile`
- If a **new root-level file** is needed and it is not in the list above: **ASK THE USER FOR AUTHORIZATION** before proceeding
- Documentation or explanatory `.md` files → `docs/`
- E2E tests → `e2e/`, integration tests → `tests/integration/`
- Support scripts → `scripts/`

## Mandatory Verification

After every significant change (new endpoint, new feature, refactor), run in order:

1. `pnpm lint` — verify there are no linting errors
2. always run the relevant unit tests for the touched files or modules
3. always run the relevant E2E tests for the affected user flow when the change impacts UI or journey
4. run integration tests when the change touches APIs, auth, DB, webhooks, jobs, or external integrations
5. `pnpm build` — verify the build compiles

If a step fails, fix it before declaring the task complete. Do not ask the user to verify: **verify autonomously**.

Prefer fast, targeted suites during iteration; before closing the task, any added or updated tests must have actually been run and must pass.

## Linting and Formatting

Do not manually search for style or formatting issues in code. Always use deterministic tools:

- `pnpm lint --fix` for automatic fixes
- If the project has a configured formatter (Prettier, Biome), run it
- Focus on logic, not formatting — the linter/formatter is more precise and faster

## Available Skills (`skills.sh`)

- `wshobson/agents@api-design-principles` — consistent execution-side API decisions
- `wshobson/agents@auth-implementation-patterns` — robust auth/JWT handling
- `wshobson/agents@code-review-excellence` — quality control before closing a task
