---
name: gh-cli
description: Use GitHub CLI for PRs, issues, reviews, diffs, repository metadata, and scriptable GitHub workflows. Use it when the task touches repositories, pull requests, issues, or GitHub releases.
allowed-tools: Bash(gh *)
---

# GitHub CLI

Prefer `gh` over MCP-based GitHub workflows when the task needs linear, scriptable operations with concise output.

## Basic Commands

```bash
gh --version
gh auth status
gh repo view --web
gh repo view OWNER/REPO
gh issue view 123
gh issue list --limit 20
gh pr status
gh pr view 123
gh pr diff 123
gh pr checks 123
gh pr create --fill
gh pr comment 123 --body "..."
```

## Operational Patterns

- always verify `gh auth status` before depending on remote GitHub data
- for review and triage: `gh pr view`, `gh pr diff`, `gh pr checks`
- for issue-driven development: `gh issue view <id>` and then local implementation
- for more structured automation use `gh api` with JSON output and parsing via `jq`

## Note

- for enterprise environments use `gh auth login --hostname <host>`
- prefer JSON output where available when post-processing is needed