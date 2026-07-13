# Security

This is a reference implementation with no production deployment and no real
data. It still holds itself to the hygiene it is meant to demonstrate.

## Secrets policy

- **No secrets in the repository, tree or history.** `gitleaks` runs in CI on
  every push and pull request with full history (`fetch-depth: 0`), configured by
  [`.gitleaks.toml`](./.gitleaks.toml).
- **`.env.example` carries placeholder names only.** A unit test
  ([`tests/env-example.test.ts`](./tests/env-example.test.ts)) asserts every line
  is a `NAME=<placeholder>` and that no value looks like a real credential, so a
  real secret cannot be pasted in by accident.
- **`.env` and `.env.*` are gitignored** (with `!.env.example` re-included). Real
  configuration lives in `.env.local`, which is never committed.

## Data

Everything in this repository is synthetic. There is no real personal data, and
no production prompts, schema, or business logic. The two demo users exist only
to demonstrate tenant isolation.

## Isolation

- Per-user Row-Level Security is written into each table's migration and enforced
  by a static CI gate ([`docs/decisions/008`](./docs/decisions/008-rls-in-migration-gated.md)).
  The audit table is additionally append-only at the policy layer (no update or
  delete policy) and by trigger.
- The in-memory backend enforces the same isolation in code, and the offline
  tests assert one tenant cannot see another's records or audit chain.

## Model calls

Every model call goes through one gateway that forces zero-data-retention and
writes a metadata-only audit event referencing (not copying) the transcript
([`docs/decisions/004`](./docs/decisions/004-single-zero-retention-gateway.md)).
The real transport refuses to send if zero-data-retention is not set.

## Out of scope

Authentication (MFA, passkeys, idle-lock) is intentionally not implemented; the
app uses a lightweight demo session. The tenancy model this plugs into is
described in [`docs/architecture/tenancy-and-rls.md`](./docs/architecture/tenancy-and-rls.md).

## Reporting

This is a portfolio reference implementation, not a maintained product. If you
spot something interesting, open an issue.
