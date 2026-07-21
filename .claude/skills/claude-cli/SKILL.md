---
name: claude-cli
description: Use Claude Code CLI for sessions, print mode, subagents, MCP management, and headless automation. Use it when the task concerns Claude Code itself or repeatable terminal workflows.
allowed-tools: Bash(claude *)
---

# Claude CLI

Use `claude` when you need to orchestrate sessions, agents, MCP, or headless workflows in a repeatable way.

## Basic Commands

```bash
claude --version
claude auth status
claude -p "explain this error"
claude --permission-mode plan
claude --agent browser-e2e
claude agents
claude mcp list
claude mcp get context7
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp remove context7
claude update
```

## Operational Patterns

- use `-p` for scriptable workflows or batch checks
- use `--permission-mode plan` for broad analysis without editing
- use `claude agents` to verify that project subagents are loaded
- use `claude mcp list/get/add/remove` to manage external connectors without hand-editing JSON when unnecessary

## Note

- `claude --bare` is useful for quick scripts without auto-discovery of skills, hooks, or MCP
- for shared or resumable sessions use `--name`, `--resume`, and `--from-pr`