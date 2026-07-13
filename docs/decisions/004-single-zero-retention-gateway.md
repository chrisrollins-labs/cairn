# 004 - A single zero-data-retention gateway is the only model egress

**Status:** Accepted

## Context

If every feature can call a model on its own terms, then privacy guarantees are
only as good as the least careful call site. One forgotten retention flag, one
feature that logs a raw prompt, one direct SDK call, and the promise is broken -
and you cannot even find all the places to check.

## Decision

There is exactly one path from this app to a model: the `AiGateway`. It enforces
its guarantees in one place - an allow-list of flows, a per-flow model,
**zero-data-retention set on every call**, and a transcript written for each -
and nothing else in the app knows a provider's wire format. The transport is a
seam: the real one targets any OpenAI-compatible endpoint over `fetch` (no
vendor SDK), and it refuses to send if zero-data-retention is not set.

Crucially, the gateway can write a transcript but has no access to the record
store. Its output is always a proposal or a labeled artifact - never a committed
record (see ADR-001).

## Consequences

- Retention, flow allow-listing, and usage logging are provably uniform, because
  there is one implementation of them.
- Swapping providers is a change to one composition line; the 50-test suite runs
  fully offline against a deterministic mock transport.
- A feature cannot "reach around" the gateway without importing it, which code
  review and the flow allow-list both make obvious.
