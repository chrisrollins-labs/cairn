/**
 * Time and identity are injected, never reached for directly, so the whole core
 * is deterministic under test (ADR-009). Production wires the system clock and a
 * UUID generator; tests wire a fixed clock and a counter.
 */

export type Clock = () => number;

export const systemClock: Clock = () => Date.now();

export type IdGen = () => string;

export const uuidGen: IdGen = () => crypto.randomUUID();
