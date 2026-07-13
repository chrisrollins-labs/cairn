import type { AiTransport } from "../transport";
import type { AiCompletionRequest, AiCompletionResult } from "../types";

/**
 * A deterministic, offline transport. Same input in, same output out — no
 * network, no clock, no randomness — so it is both the test double and the
 * zero-infrastructure default when no API key is configured (ADR-009).
 *
 * It is allowed to "read the instructions": when the system prompt asks for a
 * JSON object with title/body (the draft flow), it returns valid JSON derived
 * from the note; otherwise it returns a short reflection (the assess flow).
 * This lets the structured-output path (gateway.ts) be exercised end to end
 * with no real model.
 */
export function createMockTransport(): AiTransport {
  return {
    async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
      const system = request.messages.find((m) => m.role === "system")?.content ?? "";
      const note = request.messages.find((m) => m.role === "user")?.content ?? "";

      const wantsJson = /json/i.test(system) && /title/i.test(system);
      const text = wantsJson ? draftJson(note) : reflection(note);

      return {
        text,
        model: request.model,
        provider: "mock",
        usage: {
          promptTokens: countTokens(request.messages.map((m) => m.content).join(" ")),
          completionTokens: countTokens(text),
        },
      };
    },
  };
}

function draftJson(note: string): string {
  const source = extractNote(note);
  const title = deriveTitle(source);
  const body = deriveBody(source);
  return JSON.stringify({ title, body });
}

function reflection(note: string): string {
  const source = extractNote(note);
  const firstWords = source.split(/\s+/).slice(0, 8).join(" ");
  return (
    `This entry records a moment described as "${firstWords}". ` +
    `It reads as a single, self-contained note; no action items are implied. ` +
    `This reflection was generated automatically and is not part of the entry.`
  );
}

/** Pull the note out of the templated user message (after the marker). */
function extractNote(userContent: string): string {
  const marker = userContent.lastIndexOf("NOTE:");
  const raw = marker >= 0 ? userContent.slice(marker + "NOTE:".length) : userContent;
  return raw.trim();
}

function deriveTitle(note: string): string {
  const words = note.replace(/\s+/g, " ").trim().split(" ").slice(0, 6);
  const joined = words.join(" ").replace(/[.,;:!?]+$/, "");
  if (joined.length === 0) return "Untitled entry";
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function deriveBody(note: string): string {
  const clean = note.replace(/\s+/g, " ").trim();
  if (clean.length === 0) return "(empty note)";
  const withPeriod = /[.!?]$/.test(clean) ? clean : `${clean}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

/** A crude, stable token estimate — enough for cost/usage instrumentation. */
function countTokens(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}
