---
description: Git version-control rules — read when working on commits, branching, merges, or .gitignore
alwaysApply: false
---

# 06 — GIT

## Mandatory

- the project must include `.gitignore`

## Conventional Commits

Format: `type(scope): description`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `ci`

Scope: `app`, `api`, `admin`, `auth`, `db`, `ui`, `config`, `e2e`

## Branching

- `main` — stable production
- `develop` — integration
- `feature/<name>` — new features
- `fix/<name>` — bugfixes
- `hotfix/<name>` — urgent fixes on main

## Do Not Version

- `.env*`
- `node_modules/`
- `build/`, `.next/`
- `coverage`
- `task-*.json`

## Version

- screenshot
- `.planning/`

## Available Skills (`skills.sh`)

- `supercent-io/skills-template@git-workflow` — Git workflow
- `github/awesome-copilot@git-commit` — commit message
- `github/awesome-copilot@conventional-commit` — conventional commits

