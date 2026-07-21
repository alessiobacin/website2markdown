---
description: TDD and quality gate rules
alwaysApply: true
---

# 04 — TDD

## Mandatory TDD

1. failing test
2. minimal code
3. test passes
4. refactor
5. shared state update

- For every new or fixed feature/behavior: write or update the failing unit test first, then implement.
- Adding feature code without updating the relevant automated coverage is not acceptable.

## Test Levels

### Unit Tests (TDD)

- Covered by the TDD cycle: every new logic unit (services, utilities, hooks) must have unit tests **before** the code.
- Boilerplate tests like `should create` do not count as coverage.
- Framework: Vitest
- **Collocated**: place the test next to the source file with suffix `.test.ts` / `.test.tsx`
  - Example: `src/services/articles.service.ts` → `src/services/articles.service.test.ts`
  - Example: `src/components/admin/ArticleForm.tsx` → `src/components/admin/ArticleForm.test.tsx`

### Integration Tests (API/Backend)

- Run integration tests when the change touches boundaries between modules or systems: endpoints, server actions, DB access, auth/authz, webhooks, multi-step code paths, or backend regressions.
- Every new or modified endpoint must have integration tests.
- Test: status codes, response shape, input validation, authentication, authorization.
- Place them in `tests/integration/`.

### E2E Tests (User Flows)

- Every user-visible feature (page, wizard, flow) must have at least one Playwright E2E test.
- Place them in `e2e/` (project root, Playwright scaffold)
- Test the full flow, not just element presence.
- For every UI or user-journey addition or fix, create or update at least one E2E test and run it before closing the task.

## Test Placement Summary

| Tipo | Posizione | Naming |
|------|-----------|--------|
| Unit | Collocated next to source | `*.test.ts` / `*.test.tsx` |
| Integration | `tests/integration/` | `*.test.ts` |
| E2E | `e2e/` | `*.spec.ts` |

## Bugfix Policy

- Every bugfix must include a regression test at the appropriate level (unit, integration, or E2E).
- Do not leave failing tests at the end of the task.

## Mandatory Test Execution Per Task

- Every feature addition or fix always requires running the relevant unit tests.
- Every user-impacting feature addition or fix always requires running the relevant E2E tests.
- Integration tests run when the change requires them, not mechanically on every task.
- Before declaring the work complete, verify that added or updated tests were actually run and pass.

## Available Skills (`skills.sh`)

- `mattpocock/skills@tdd` — TDD cycle
- `am-will/codex-skills@tdd-test-writer` — test-first writing
- `currents-dev/playwright-best-practices-skill@playwright-best-practices` — E2E Playwright
- `anthropics/skills@webapp-testing` — UI testing
