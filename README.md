# Apex LSAT

A personal LSAT study system: visual lessons, adaptive drilling, blind review, error taxonomy, spaced re-drill, timing intelligence, and a grounded tutor.

- Spec: see `docs/spec.md`
- Plan: see `docs/plan.md`

## Run

```bash
pnpm install
pnpm db:migrate
pnpm content:load
pnpm dev
```

Data lives in a local PGlite database at `./data/apex` by default. Set `DATABASE_URL` to use Postgres (e.g. Supabase) instead.

## Scripts

- `pnpm test` — unit tests (Vitest)
- `pnpm test:e2e` — Playwright (desktop + phone)
- `pnpm typecheck`, `pnpm lint`
