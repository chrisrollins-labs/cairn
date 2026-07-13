# 006 — Prompt templates are versioned data, locked into provenance

**Status:** Accepted

## Context

Prompts change. When a record was produced with an assistant's help, "which
prompt produced this?" is a question you will eventually need to answer — for a
user asking why, for a bug, for an audit. If the prompt is just a string that
gets edited in place, that history is gone.

## Decision

Each prompt template carries a `version`. Changing the wording is a deliberate
version bump. The version in force when a draft is produced is **locked onto the
draft** and carried into the committed record's provenance and into the audit
event. The tenancy GUC and the record's `ai` provenance together let you answer,
for any record, exactly which template version shaped it.

## Consequences

- "Which prompt produced this record?" is answerable from the data, forever.
- Changing a prompt is a versioned, reviewable event, not an invisible edit.
- The prompts shipped here are generic and synthetic; the discipline is the
  point, not the copy.
