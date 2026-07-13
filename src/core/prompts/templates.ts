import type { AiFlow, AiMessage } from "@/core/ai/types";

/**
 * Prompt templates are versioned data (ADR-006). The text of a template is
 * fixed at a version; changing the wording is a deliberate version bump, and
 * the version in force at capture is locked onto the draft and carried into the
 * committed record's provenance. That makes "which prompt produced this?" a
 * question the audit trail can answer, forever.
 *
 * The prompts here are generic and synthetic — they carry none of the wording
 * of any production system. The point is the versioning and provenance
 * discipline, not the copy.
 */

export interface PromptTemplate {
  readonly id: string;
  readonly version: number;
  readonly flow: AiFlow;
  readonly system: string;
}

export const DRAFT_ENTRY_TEMPLATE: PromptTemplate = {
  id: "draft_entry",
  version: 1,
  flow: "draft_entry",
  system: [
    "You help a person turn a short personal note into a clean record entry.",
    'Respond with a single JSON object with two string fields: "title" (at most',
    'eight words) and "body" (a faithful first-person rewrite of the note).',
    "Do not invent facts that are not in the note. Output only the JSON object,",
    "with no surrounding prose or code fences.",
  ].join(" "),
};

export const ASSESS_ENTRY_TEMPLATE: PromptTemplate = {
  id: "assess_entry",
  version: 1,
  flow: "assess_entry",
  system: [
    "You produce a brief, neutral reflection on an existing record entry.",
    "Do not restate the entry. Keep it to two or three sentences. This",
    "reflection is a separate, AI-generated artifact and must never be",
    "presented as the person's own words.",
  ].join(" "),
};

export const TEMPLATES: Record<AiFlow, PromptTemplate> = {
  draft_entry: DRAFT_ENTRY_TEMPLATE,
  assess_entry: ASSESS_ENTRY_TEMPLATE,
};

/** Build the messages for the draft flow. Least context: only the note. */
export function buildDraftEntryMessages(note: string): AiMessage[] {
  return [
    { role: "system", content: DRAFT_ENTRY_TEMPLATE.system },
    { role: "user", content: `NOTE:\n${note}` },
  ];
}

export interface AssessEntryContext {
  readonly title: string;
  readonly body: string;
  /** Already-scoped prior reflections (see scoping.ts). May be empty. */
  readonly priorReflections: readonly string[];
}

/** Build the messages for the assess flow from already-scoped context. */
export function buildAssessEntryMessages(context: AssessEntryContext): AiMessage[] {
  const priorBlock =
    context.priorReflections.length > 0
      ? `\n\nEARLIER REFLECTIONS (for continuity only):\n` +
        context.priorReflections.map((r) => `- ${r}`).join("\n")
      : "";

  return [
    { role: "system", content: ASSESS_ENTRY_TEMPLATE.system },
    {
      role: "user",
      content: `ENTRY TITLE: ${context.title}\n\nENTRY BODY:\n${context.body}${priorBlock}`,
    },
  ];
}
