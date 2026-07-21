---
description: Start an Agent Team using the project's existing specialist agents when the work benefits from parallel ownership
argument-hint: [task]
---

Create an agent team for this project task:

$ARGUMENTS

Use the existing project agent definitions in `.claude/agents/` as teammate types when they fit:

- `platform-bootstrap` for Claude Code setup, runtime checks, MCP/tooling, and environment bootstrap
- `backend-dev` for route handlers, backend logic, validation, and db-layer/Drizzle-backed API work
- `browser-e2e` for UI regressions, browser repros, and user-flow verification
- `api-qa` for API smoke tests, contract checks, and request debugging
- `deploy-ops` for Docker, runtime health, and deployment verification
- `db-backup` before risky schema or data operations

Execution rules:

1. First decide whether team mode is justified.
2. If the work is sequential, tightly coupled, or likely to touch the same files, do not create a team. Explain why and proceed with a single session or subagents.
3. If team mode is justified, choose only the teammates needed for this task.
4. Require plan approval for teammates before edits.
5. Partition ownership explicitly so each teammate owns a distinct file set or concern.
6. Start with research and planning, then implementation, then verification.
7. Reuse `.claude/agents/*` as teammate types where useful.
8. When using those teammate types, rely on their `tools`, `model`, and body instructions. Do not assume their `skills:` or `mcpServers:` frontmatter is applied to teammates.
9. Prefer subagents instead of an agent team when only one isolated side task is needed.

Before starting edits, produce a short team plan with:

- whether team mode is justified
- chosen teammates
- ownership boundaries
- expected merge or coordination risks

After the team finishes, produce a short synthesis with:

- what each teammate did
- key decisions
- conflicts avoided or encountered
- final verification status
