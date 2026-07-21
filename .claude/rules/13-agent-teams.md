---
description: Guidance for when and how to use Claude Code Agent Teams in this repository
alwaysApply: false
---

# 13 — AGENT TEAMS

## Use Agent Teams Only When Parallel Work Is Real

- use Agent Teams for cross-layer work that can be partitioned cleanly across teammates
- use Agent Teams for research, review, debugging with competing hypotheses, or feature work with separate ownership areas
- do not use Agent Teams for sequential work, small fixes, or same-file edits
- if only one isolated side task is needed, prefer a subagent instead

## Reuse Project Agents

- prefer the project agent definitions in `.claude/agents/` as teammate types before inventing ad hoc roles
- current reusable teammate types include:
  - `platform-bootstrap`
  - `backend-dev`
  - `browser-e2e`
  - `api-qa`
  - `deploy-ops`
  - `db-backup`

## Important Compatibility Rule

- when a project subagent is reused as an Agent Team teammate, rely on its `tools`, `model`, and markdown body
- do not assume the teammate also receives the subagent frontmatter fields `skills:` or `mcpServers:`
- if a behavior is critical in team mode, state it in the agent body or in the team prompt

## Coordination Rules

- assign each teammate a distinct ownership boundary
- avoid having multiple teammates edit the same file set
- have the lead request a short plan before broad edits
- use Agent Teams only when the coordination overhead is worth the additional token cost

## Runtime Notes

- Agent Team runtime state is ephemeral and managed by Claude Code; do not pre-author or hand-edit runtime team files
- `.claude/agents/` remains the reusable project-side definition surface for teammate roles
- if agent definition files are added or edited directly on disk, restart the Claude session so they reload
