/**
 * Tolerant extraction of a single JSON object from model text. Models sometimes
 * wrap JSON in prose or a ```json fence; this pulls out the object so the Zod
 * schema (records/schema.ts) can be the real gate on structure (ADR-002 in the
 * rag sibling; here it guards the draft flow). If nothing object-shaped is
 * found, it throws and the caller triggers the corrective retry.
 */
export function extractJsonObject(text: string): unknown {
  let s = text.trim();

  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence && fence[1] !== undefined) s = fence[1].trim();

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object found in model output");
  }

  return JSON.parse(s.slice(start, end + 1));
}
