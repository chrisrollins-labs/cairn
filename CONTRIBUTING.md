# Contributing

This is a portfolio reference implementation, so contributions are unlikely - but
the conventions matter, and they double as documentation of how the project holds
its bar.

## Development

```bash
npm install
npm run dev     # in-memory backend + mock model; no database or API key needed
```

## The check suite

Run what CI runs before pushing. All of it is offline and deterministic:

```bash
npm run typecheck        # tsc --noEmit, strict
npm run lint             # eslint (Next flat config)
npm test                 # vitest, 50 tests, no network or DB
npm run check:rls        # every app table has RLS + a policy
npm run check:migrations # NNNN_name.sql, strictly increasing
npm run build            # next build
```

CI additionally runs `gitleaks` (full history) and CodeQL.

## Conventions

- **TypeScript strict**, everywhere. No `any` slipped through a seam.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Migrations** are append-only: add a new `NNNN_name.sql`; never edit an applied
  one. RLS and its policies go in the same migration as the table they protect.
- **Tests** are deterministic: inject the clock and id generator, script the
  transport and the query executor; never reach for the real clock, network, or
  database.
- **No plain hyphen substitutes**: this project uses a plain hyphen, never an em
  dash.

## Architecture Decision Records

Non-obvious choices are recorded as ADRs in [`docs/decisions`](./docs/decisions),
numbered `NNN-kebab-title.md`, each with **Status / Context / Decision /
Consequences**. If you change a load-bearing decision, add or supersede an ADR
rather than editing the code silently.
