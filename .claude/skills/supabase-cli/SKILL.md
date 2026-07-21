---
name: supabase-cli
description: Use Supabase CLI for local stacks, migrations, seeding, and type generation. Use it when the task touches the database, schema, local Supabase services, or local development workflows.
allowed-tools: Bash(supabase *) Bash(npx supabase *)
---

# Supabase CLI

Use `supabase` for local development, migrations, and type generation. If the project pins the dependency locally, prefer `npx supabase`.

## Basic Commands

```bash
supabase --version
npx supabase init
npx supabase start
npx supabase status
npx supabase db diff
npx supabase db push
npx supabase gen types typescript --local
```

## Operational Patterns

- initialize the project only if the `supabase/` folder does not exist
- use `npx supabase start` for a local stack aligned with the Docker runtime
- use `db diff` before creating new migrations and `db push` only after validation
- generate TypeScript types when schema or policies change in ways that affect application code

## Note

- the CLI requires a container runtime compatible with the Docker API
- avoid destructive commands in the presence of real data; always follow the repository's additive rules