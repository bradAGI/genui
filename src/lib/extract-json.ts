/**
 * Extract a JSON object from arbitrary model output. Tries, in order:
 *   1. direct JSON.parse of the whole string
 *   2. content of a fenced ```json ... ``` block
 *   3. content of a fenced ``` ... ``` block
 *   4. the substring from the first { to the last } (with brace-balance check)
 * Returns null if nothing parses.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;
  const trimmed = text.trim();

  try { return JSON.parse(trimmed); } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try { return JSON.parse(slice); } catch {}
  }

  return null;
}
