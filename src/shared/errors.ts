/**
 * Domain errors. Distinct types so the app layer can map them to HTTP status
 * and UI copy without string-matching messages.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A referenced aggregate does not exist (or is not visible to this tenant). */
export class NotFoundError extends DomainError {}

/** The action is not allowed from the aggregate's current state. */
export class InvalidStateError extends DomainError {}

/** Input failed validation before any state was touched. */
export class ValidationError extends DomainError {}

/**
 * A caller tried to reach a write path it must not have. The AI flows can only
 * ever produce drafts and assessments; if anything on that path attempts to
 * commit a record, that is a bug we want to fail loudly, not paper over.
 */
export class ForbiddenWriteError extends DomainError {}
