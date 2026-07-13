# 005 — Least-context, per-flow scoping of model calls

**Status:** Accepted

## Context

The easy thing is to feed a model everything you have — all prior entries, the
whole history — and let it sort out what matters. That quietly maximizes cost,
latency, and exposure on every single call, and it grows without bound as a
user's history grows.

## Decision

Each flow gets the minimum context it needs and nothing more. The draft flow
sees only the note. Cross-entry context (used by the assessment flow) is
**opt-in and off by default**, and even when enabled it is capped hard: a
bounded number of items, a bounded total size, oldest trimmed first — and it
draws on prior AI reflections, not raw entry bodies. The scoping logic is a pure,
unit-tested function; the service fetches candidates, the scoper decides what
actually goes into the prompt.

## Consequences

- The blast radius of any single model call is small and predictable, regardless
  of how much history exists.
- "Include prior context" is a deliberate, visible choice at the call site, not a
  default that accumulates silently.
- Because scoping is pure, its caps are tested directly rather than inferred from
  end-to-end behavior.
