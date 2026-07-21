---
name: postman-cli
description: Use Postman CLI for collection runs, request debugging, workspace sync, and API governance. Use it when the task touches Postman collections, API smoke tests, or specification linting.
allowed-tools: Bash(postman *)
---

# Postman CLI

Prefer `postman` over a Postman MCP when the workflow can be executed entirely from the terminal.

## Basic Commands

```bash
postman --version
postman login
postman collection run postman/collection.json
postman request
postman workspace prepare
postman workspace push
postman spec lint openapi.yaml
postman api lint
postman mock run mock-config.json
```

## Operational Patterns

- use `postman collection run` for smoke tests, regressions, and CI validation
- use `postman workspace prepare` before pushing local collections or environments
- use `postman spec lint` or `postman api lint` when the rules require API quality gates
- use `postman request` for quick debugging of individual requests without opening the UI

## Note

- some operations require a Postman API key or explicit login
- in CI prefer non-interactive commands and concise output