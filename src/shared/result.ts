/**
 * A tiny Result type, used where a failure is an expected, first-class outcome
 * rather than an exception - e.g. verifying a hash chain that may legitimately
 * come back "broken". Keeping expected failure out of the throw path makes the
 * handling explicit at the call site.
 */

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
