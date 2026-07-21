---
description: Curated project CLIs, operational preferences, and local skills to use with Claude Code
alwaysApply: true
---

# 12 — CLI TOOLS

## Operating Principle

- if the same work can be done via CLI or MCP, prefer the **CLI** (see `conventions/TOOL-SELECTION.md`)
- CLIs reduce context usage, are easier to script, and integrate better with hooks, subagents, and automated validation
- before using a curated CLI, load the corresponding **local skill**

## Curated CLIs

| CLI | Local skill | Preferred use |
|---|---|---|
| `claude` | `claude-cli` | sessions, print mode, subagents, MCP management, CLI automation |
| `gh` | `gh-cli` | issues, PRs, diffs, reviews, GitHub metadata |
| `playwright-cli` | `playwright-cli` | token-efficient browser automation and E2E validation |
| `postman` | `postman-cli` | collection runs, request debugging, API governance, workspace sync |
| `docker` | `docker-cli` | local runtime, compose, health checks, and support services |
| `graphify` | `graphify` | repository knowledge graph build, query, and Claude Code graph-first navigation |

## Binding Preferences

- for GitHub, do not introduce general MCP integrations if `gh` covers the flow
- for browser automation, use `playwright-cli` instead of Playwright MCP except in cases that truly require persistent introspection
- for Postman collections, mocks, and governance use `postman`
- for local V11 cluster management use `docker` with `CLUSTER_MODE=local`
- for database migrations use `drizzle-kit` (Drizzle ORM)
- for Claude Code workflows use `claude` instead of manual command descriptions or unverifiable procedures
- for graph-based repository exploration use `graphify` before broad raw-file search when `graphify-out/` exists

## Base Utilities

- use `rg` for file/content search when available
- use `jq` for JSON parsing in shell scripts and hooks
- use `git` directly for diff, blame, log, and worktree operations

## Required Skills

- local skills for curated CLIs must live in `.claude/skills/<name>/SKILL.md`
- every new agent that depends on a curated CLI must preload the corresponding skill via the `skills:` field
