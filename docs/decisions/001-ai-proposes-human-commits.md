# 001 - AI proposes; a single explicit action commits

**Status:** Accepted

## Context

The product lets an assistant help turn a rough note into a clean record. The
risk is obvious: a model that can write directly to a user's records can put
words in their mouth, quietly, at scale. "We prompt it carefully" is not a
control - it is a hope.

## Decision

Make the gate structural, not procedural. The AI path can only ever create a
**draft** (a proposal) or an **assessment** (a separate labeled artifact). A
record comes into existence through exactly one private method, `commitRecord`,
which is reachable only by an explicit human action - approving a draft or
authoring an entry directly. The AI-facing code has no reference to the record
store's write path at all.

## Consequences

- "The AI wrote a record without me" is not a bug to guard against; it is
  unrepresentable in the code. A test asserts the AI paths leave the record
  count untouched.
- Approval is where provenance is stamped: who approved, from which draft, under
  which prompt-template version, and the content hash of exactly what was
  committed.
- A human authoring directly skips the gate, because they are the author - the
  gate exists for machine-proposed content, not to add friction to a person's
  own words.
