# cairn

**AI can draft, but only a human can commit - and every change is provable after the fact.**

[![CI](https://github.com/chrisrollins-labs/cairn/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisrollins-labs/cairn/actions/workflows/ci.yml)
[![CodeQL](https://github.com/chrisrollins-labs/cairn/actions/workflows/codeql.yml/badge.svg)](https://github.com/chrisrollins-labs/cairn/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](./tsconfig.json)

> This repository is a **sanitized reference implementation** inspired by
> production experience building a privacy-first personal record-keeping app. It
> ships none of that app's prompts, schema, data, or business logic. Everything
> here is synthetic; the domain is deliberately neutral so the **engineering
> patterns** are the point.

A cairn is a trail marker built by stacking stones, each resting on the one
below. This project is named for its audit chain: each event's hash folds in the
one before it, so the record of what happened stands only as long as no one has
disturbed a stone.

## What this is

A small, working system for personal records where an assistant can help but is
never in charge. You write a rough note; the model proposes a clean entry;
**nothing becomes a record until you review and approve it.** Every step - the
proposal, your edits, your decision, the commit - is appended to a
tamper-evident, per-user audit chain you can verify at any time. It runs with
zero infrastructure (in-memory, deterministic mock model) and drops onto
Postgres by changing one composition line.

## Why it exists

Wiring a prompt to an API key is a demo. Letting a model touch a person's records
raises harder questions, and this repo is a set of answered ones:

- How do you keep a model from putting words in a user's mouth? _(It can only
  propose; a person commits - ADR-001.)_
- How do you prove your audit log wasn't edited after the fact? _(A hash chain
  whose writer and verifier share one function - ADR-002.)_
- How do you keep every model call zero-retention and least-context, uniformly?
  _(One gateway is the only egress - ADR-004, ADR-005.)_
- How do you keep machine commentary from being mistaken for the user's words?
  _(Separate, versioned, labeled artifacts - ADR-007.)_
- How do you make tenant isolation provable, not aspirational? _(RLS in every
  table's migration, gated in CI - ADR-008.)_

## Three ideas do most of the work

1. **The AI never writes a record.** It produces a draft or a labeled
   assessment. A single private commit path is the one door into the record
   store, reachable only by an explicit human action. "The AI wrote a record on
   its own" is unrepresentable, not merely discouraged.
2. **Every change joins a hash chain you can verify.** Each event folds in the
   previous event's hash; alter, drop, or reorder one and every hash downstream
   stops matching. The same function seals and checks the chain, in TypeScript by
   default and in Postgres triggers when a database is used.
3. **The model is a guest.** One gateway is the only way to reach a model:
   zero-data-retention on every call, least-context per flow, a transcript for
   each, and output that is always a proposal or a clearly labeled artifact.

## Architecture

```mermaid
flowchart TD
  note["Your note"] --> gw["AI gateway (single egress)\nZDR · per-flow model · transcript"]
  gw --> draft["Draft (proposal)"]
  draft -->|human reviews / edits| decide{Approve?}
  decide -->|reject| discard["Discarded - no record"]
  decide -->|approve| commit["commitRecord (sole writer)\nstamps provenance + content hash"]
  commit --> record["Record"]
  record -->|optional| assess["Assessment\nseparate · versioned · AI-labeled"]
  draft -.audit.-> chain[("Per-user audit chain\ntamper-evident")]
  commit -.audit.-> chain
  assess -.audit.-> chain
  chain --> verify["verify() - recompute every link"]
```

The AI path (gateway → draft / assessment) has no access to `commitRecord`.
Every box that changes state writes one event to the chain.

## Tech stack

- **TypeScript (strict)** - `strict`, `noUncheckedIndexedAccess`, and friends
- **Next.js 16** (App Router, React 19) - a thin UI + Server Actions over the domain
- **PostgreSQL** with Row-Level Security and a trigger-sealed audit chain
- **Zod** for structured-output and input validation
- **Vitest** - 50 offline, deterministic tests
- **GitHub Actions** + gitleaks + CodeQL

The domain core is framework-agnostic; Next.js is a driver, not a dependency of
the patterns.

## Getting started

```bash
npm install
npm run dev        # in-memory backend + mock model - zero infrastructure
```

Open http://localhost:3000, write a note, and approve a draft. No database or API
key is required. The full check suite, exactly what CI runs:

```bash
npm run typecheck
npm run lint
npm test              # 50 offline tests, no network or DB
npm run check:rls     # every table has RLS + a policy (static)
npm run check:migrations
npm run build
```

To exercise the Postgres path instead (the pg-backed store, per-user RLS, and the
DB-sealed audit chain), start a local database with Docker, point the app at it,
and migrate:

```bash
docker compose up -d          # local Postgres, matches DATABASE_URL in .env.example
cp .env.example .env.local    # then set CAIRN_STORE=postgres
npm run db:migrate
npm run dev
```

`docker-compose.yml` provisions `postgres://cairn:cairn@localhost:5432/cairn`, the
value already in `.env.example`. To use a real model, set the `AI_*` variables;
otherwise the deterministic mock is used.

## What's inside

| Area | What it does |
| --- | --- |
| `src/core/audit` | The tamper-evident hash chain: preimage protocol, append, and a verifier that shares the writer's hash function. |
| `src/core/records` | The review gate: draft → review → the single `commitRecord` path; labeled assessments. |
| `src/core/ai` | The one gateway to a model: ZDR, per-flow routing, least-context scoping, transcripts, providers behind a seam. |
| `src/core/prompts` | Prompt templates as versioned data, locked into provenance. |
| `src/core/store` | Store seams with an in-memory default and a Postgres adapter. |
| `db/migrations` | Schema as truth: RLS per table and the SQL trigger + verifier for the chain. |
| `app` | A minimal App Router UI + Server Actions that drive the whole flow. |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - the shape of the system, end to end
- [`docs/AUDIT.md`](./docs/AUDIT.md) - what the audit chain proves, and honestly what it does not
- [`docs/decisions`](./docs/decisions) - nine ADRs, one per load-bearing choice
- [`docs/architecture`](./docs/architecture) - the review gate and the tenancy/RLS model
- [`SECURITY.md`](./SECURITY.md) - the secrets policy and threat notes

## Author

Built by **Chris Rollins** - full-stack / AI engineer.

- Portfolio & case study: [rollinsdigital.com/projects/cairn](https://rollinsdigital.com/projects/cairn)
- GitHub: [github.com/chrisrollins-labs](https://github.com/chrisrollins-labs)
- LinkedIn: [in/christopher-t-rollins](https://www.linkedin.com/in/christopher-t-rollins)

This is a sanitized reference implementation from my portfolio.

## License

[MIT](./LICENSE)
