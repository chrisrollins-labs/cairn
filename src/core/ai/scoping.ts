/**
 * Least-context scoping (ADR-005).
 *
 * A model call gets the minimum context the flow needs and nothing more. Cross-
 * entry context is opt-in and, even when enabled, is capped hard: a bounded
 * number of items, a bounded total size, oldest trimmed first. Feeding "all of
 * history" into every prompt is how cost, latency, and exposure all creep up at
 * once; this keeps the blast radius of any single call small and predictable.
 *
 * Pure functions, no I/O — the service fetches candidates, this decides what
 * actually goes in the prompt.
 */

export interface ScopeOptions {
  /** Whether to include any prior context at all. Default off. */
  readonly includePriorContext: boolean;
  /** Hard cap on the number of prior items. */
  readonly maxItems: number;
  /** Hard cap on the total characters across included items. */
  readonly maxChars: number;
}

export const DEFAULT_SCOPE: ScopeOptions = {
  includePriorContext: false,
  maxItems: 5,
  maxChars: 2_000,
};

/**
 * Choose which prior reflections (most-recent-first input) are allowed into a
 * prompt. Returns them in chronological order (oldest first) so the prompt
 * reads naturally, after trimming the oldest to fit the caps.
 */
export function scopePriorReflections(
  mostRecentFirst: readonly string[],
  options: ScopeOptions = DEFAULT_SCOPE,
): string[] {
  if (!options.includePriorContext) return [];

  const chosen: string[] = [];
  let total = 0;

  for (const item of mostRecentFirst) {
    if (chosen.length >= options.maxItems) break;
    if (total + item.length > options.maxChars) break;
    chosen.push(item);
    total += item.length;
  }

  // Input was most-recent-first; return oldest-first for prompt readability.
  return chosen.reverse();
}
