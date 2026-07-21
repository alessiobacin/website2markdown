---
name: graphify
description: Build and query a local knowledge graph for this repository, then use Graphify outputs to answer architecture and relationship questions before falling back to broad raw-file search.
allowed-tools: Bash(graphify *) Bash(python3 -m graphify *)
---

# Graphify

Use `graphify` when you need structure-level understanding of the repository rather than raw keyword search.

## Core Workflow

```bash
graphify .
graphify update .
graphify query "show the auth flow"
graphify path "ModuleA" "ModuleB"
graphify explain "tenant isolation"
```

## Operating Pattern

- start with `graphify-out/GRAPH_REPORT.md` when it exists
- use `graphify query`, `graphify path`, and `graphify explain` for relationship and architecture questions
- run `graphify update .` after meaningful code changes to keep the graph current
- prefer Graphify for cross-module reasoning, rationale discovery, and hidden dependency tracing
- keep normal CLI-first workflows for edits, tests, lint, builds, and deterministic deployment or database operations

## Notes

- official package name: `graphifyy`
- installed CLI command: `graphify`
- Claude Code integration is typically enabled with `graphify claude install`
- Graphify can also expose `graph.json` as an MCP server when structured graph access is needed repeatedly