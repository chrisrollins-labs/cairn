# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.0] - 2026-07-13

Initial public reference implementation.

### Added

- **Review gate**: AI produces only drafts and labeled assessments; a single
  private `commitRecord` path, reachable only by an explicit human action, is the
  one door into the record store.
- **Tamper-evident audit chain**: per-user, SHA-256 hash-linked, append-only,
  with a verifier that shares the writer's hash function - implemented in
  TypeScript (default) and as Postgres triggers + a SQL verifier.
- **Single AI gateway**: the only model egress, forcing zero-data-retention on
  every call, per-flow model routing, least-context scoping, and transcript
  logging; providers behind a `fetch`-based seam with a deterministic mock.
- **Versioned prompt templates** locked into record provenance.
- **Per-user RLS** written into each table's migration, with a static CI
  coverage gate, plus a migration-order gate.
- **Backends**: in-memory by default (zero infrastructure); Postgres behind one
  composition line, with a tenant-scoped executor.
- **UI**: a minimal Next.js App Router app with Server Actions that drive the
  whole flow, plus a demo session to show tenant isolation.
- **Hygiene**: 50 offline deterministic tests, an `.env.example` guard test,
  gitleaks, and CodeQL in CI; nine ADRs and an `AUDIT.md` on what the chain
  proves and does not.
