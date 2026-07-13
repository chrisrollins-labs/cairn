# Architecture

The system is a framework-agnostic domain core with two thin edges: a Next.js
App Router UI on top, and a choice of storage backend underneath. The patterns
live in the core; Next.js and Postgres are drivers.

## The shape

```
app/ (Next.js)                Server Actions — the only mutation surface
  └── src/server              session (current tenant) + container (backend wiring)
        └── src/core          the domain — no framework, no I/O of its own
              ├── records      the review gate + labeled assessments
              ├── audit        the tamper-evident hash chain + verifier
              ├── ai           the single model gateway + providers + scoping
              ├── prompts      versioned prompt templates
              ├── store        store seams (memory + Postgres adapters)
              └── tenancy      the current-user/tenant model
        db/migrations          schema as truth: RLS + the SQL chain trigger
```

## Seams

Everything that touches the outside world is an interface the core depends on,
never a concrete implementation:

- **`AiTransport`** — how a model is called. Real (`fetch` to an
  OpenAI-compatible endpoint) or a deterministic mock.
- **Store interfaces** (`RecordStore`, `DraftStore`, `AssessmentStore`,
  `TranscriptStore`) — persistence per aggregate. In-memory or Postgres.
- **`AuditLog`** — append / list / verify the chain. TypeScript
  (`AuditChain`) or Postgres (`PgAuditLog`, backed by the trigger).
- **`QueryExecutor`** — the one place the `pg` driver is seen.
- **`Clock` / `IdGen`** — time and identity, injected so the core is
  deterministic under test.

The composition root (`src/core/runtime.ts`) wires these once. `createMemoryService`
gives the zero-infrastructure default; `createPgService` binds the same service
to a tenant-scoped Postgres connection.

## The review gate

`RecordsService` is the whole domain and the one place the gate lives. The
invariant is mechanical: **`commitRecord` is the only method that writes to the
record store, it is private, and no AI path can call it.**

- `proposeAiDraft` → gateway → a pending **draft** (+ transcript + audit). No record.
- `editDraft` / `rejectDraft` → human touches on a pending draft.
- `approveDraft` → the gate: applies the reviewed content through `commitRecord`.
- `createHumanEntry` → a person authoring directly, also through `commitRecord`.
- `assessRecord` → gateway → a separate, labeled **assessment** (+ audit). No record.

Structured output for the draft flow is validated with Zod and gets one
corrective retry before it is rejected.

## The audit chain

Every state change appends one event to the actor's chain. See
[`docs/AUDIT.md`](./docs/AUDIT.md) for the exact preimage and guarantees. In
short: per-user, hash-linked, append-only, with a verifier that recomputes every
link using the same function the writer used — implemented both in TypeScript
(default) and as a Postgres trigger + SQL verifier (defense in depth).

## The AI gateway

One egress (`AiGateway`). It allow-lists flows, picks a per-flow model, forces
zero-data-retention on every call, and writes a transcript. It can write a
transcript but cannot reach the record store. Least-context scoping
(`src/core/ai/scoping.ts`) decides what, if any, prior context enters a prompt.

## Tenancy and RLS

Isolation is per-user everywhere. In Postgres it is Row-Level Security, with
policies written into each table's migration and a request-scoped
`app.user_id` GUC (`docs/architecture/tenancy-and-rls.md`). In memory it is a
`where ownerId` filter in every read. A CI gate proves every table has RLS and a
policy; the offline tests prove the isolation contract holds.

## Backends

| | In-memory (default) | Postgres |
| --- | --- | --- |
| Stores | arrays, `where ownerId` | RLS-scoped SQL adapters |
| Audit chain | `AuditChain` (TypeScript) | trigger-sealed + SQL verifier |
| Runs with | nothing | a database |
| Used by | `npm run dev`, all tests | `CAIRN_STORE=postgres` |

## Testing

50 tests, all offline and deterministic (`docs/decisions/009`). The transport is
a mock or a scripted double, the DB adapters are tested against a scripted
executor that records SQL and params, the clock is fixed, and ids come from a
counter. A journey test drives the full note → draft → approve → assess → verify
flow through the same service calls the Server Actions make.
