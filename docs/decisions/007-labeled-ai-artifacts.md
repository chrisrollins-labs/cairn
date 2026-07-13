# 007 - AI output is a separate, versioned, labeled artifact

**Status:** Accepted

## Context

Beyond drafting an entry, the assistant can reflect on an existing record (an
"assessment"). The danger is that machine-generated commentary gets folded into
the user's own words - so that later, no one can tell which sentences the person
wrote and which the model did.

## Decision

An assessment is stored in its own table, never merged into the record's body.
It is always labeled `ai_generated`, carries its own AI provenance, and is
**versioned per record**: generating a new one deactivates the prior active one
rather than overwriting it. Every export path renders it fenced and explicitly
attributed to the model.

## Consequences

- The boundary between "what the person wrote" and "what the model said about it"
  is preserved in the data model, not just in the UI.
- Re-assessing keeps history: you can see how the model's take changed over time.
- The record's own content hash (ADR-003) is unaffected by assessments, so its
  provenance stays clean.
