# The review gate

The single most important property of this system: **an assistant can propose,
but only a person can commit, and the code makes the difference structural.**

## The one door

`RecordsService.commitRecord` is the only method that writes to the record store.
It is `private`. Everything that creates a record goes through it, and nothing on
an AI path can reach it:

```
proposeAiDraft ─▶ drafts (pending)         ─┐
assessRecord   ─▶ assessments (labeled)     ├─ AI paths: never call commitRecord
                                            ─┘
approveDraft   ─▶ commitRecord ─▶ records   ─┐
createHumanEntry ▶ commitRecord ─▶ records   ├─ human paths: the only writers
                                            ─┘
```

The `AiGateway` — the only way to reach a model — is constructed with a
transcript store, a clock, and an id generator. It has no reference to the record
store at all. So "the AI wrote a record" is not a risk to be reviewed for; it
cannot be expressed.

## The lifecycle of a proposal

1. **Propose.** A note goes to the gateway (flow `draft_entry`), which returns
   structured `{title, body}` (validated by Zod, one corrective retry). A pending
   **draft** is stored, and `draft.proposed` is appended to the audit chain. No
   record exists.
2. **Review.** The person reads the draft next to their original note. They may
   `editDraft` (audited as `draft.edited`) as many times as they like.
3. **Decide.**
   - `approveDraft` applies the reviewed content through `commitRecord`, which
     stamps provenance (source, approver, prompt-template version, transcript id)
     and the content hash, and appends `record.committed`. The draft is marked
     approved and points at the new record.
   - `rejectDraft` marks the draft rejected and appends `draft.rejected`. No
     record is ever created.

## Why a draft, not a "pending record"

A draft is a different *kind* of thing from a record, not a record in a different
state. It lives in its own table with its own policy, and the record table only
ever contains committed, approved content. That keeps queries, exports, and the
audit story clean: everything in `records` has, by construction, passed the gate.
