---
description: MCP policy — keep only servers that add context or capability that cannot be well replaced by a CLI
alwaysApply: false
---

# 08 — MCP SERVERS

## Operating Principle

- Prefer **curated CLIs** and Claude Code native tools when the workflow is deterministic, repeatable, and centered on files/commands.
- Use MCP only when it provides **remote context**, **resources/prompts**, or **capabilities** that are not well replicated by a local CLI.
- If a mature, documented, and more token-efficient CLI exists, **do not introduce an equivalent MCP as the default operational path**.

## MCP to Keep

| Server | When to use it |
|---|---|
| `context7` | up-to-date library/framework documentation when remote, citable context is needed |
| vertical remote connectors | SaaS systems or external data sources that expose useful resources/prompts and do not have a reliable CLI for the same flow |

## MCP to Avoid as a Default

| Category | Reason | Replacement |
|---|---|---|
| local filesystem | Claude Code already has much more direct file/shell tools | native tools + `rg`/shell |
| general GitHub integration | PR, issue, and repository workflows are cheaper and more scriptable via CLI | `gh` |
| Postman | collection runs, linting, and smoke tests are more linear in the terminal | `postman` |
| browser automation | Playwright CLI is explicitly positioned as the better fit for coding agents | `playwright-cli` |

## Quick Decision Guide

1. If the task is local or scriptable, use a CLI or native tools.
2. If structured remote context is needed, evaluate MCP.
3. If the team needs a shared MCP, version it in `.mcp.json` only after ruling out an equivalent CLI.

## Memory

- global memory managed via `claude-mem`

## Available Skills (`skills.sh`)

- `anthropics/skills@mcp-builder` — MCP integrations
- `github/awesome-copilot@mcp-cli` — CLI MCP
- `upstash/context7@documentation-lookup` — doc live via Context7
- `am-will/codex-skills@context7` — technical documentation lookup

