import { z } from "zod";

/**
 * The structural gate on content. The AI's draft output and any human edit are
 * both validated against these before anything is stored, so malformed or
 * oversized content never reaches the store - regardless of whether a model or
 * a person produced it.
 */

export const DraftContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10_000),
});

export type DraftContent = z.infer<typeof DraftContentSchema>;

/** The person's free-text note that seeds an AI draft. */
export const NoteSchema = z.string().trim().min(1).max(4_000);

/** A human edit to a pending draft, or a directly-authored entry. */
export const EntryContentSchema = DraftContentSchema;
export type EntryContent = z.infer<typeof EntryContentSchema>;
