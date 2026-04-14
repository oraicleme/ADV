/**
 * STORY-198: Optional LLM-assisted sub-queries before Meilisearch Stage-1.
 * Layered *after* deterministic `buildExpandedSearchQueries` on the client — this only adds
 * 0–2 paraphrases; it does not replace lexical expansion.
 */

import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";

const MAX_PHRASES = 2;
const MAX_PHRASE_LEN = 100;
const MAX_HINTS = 40;

export function parseExpandSearchQueryJson(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { queries?: unknown };
    const raw = parsed.queries;
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const q of raw) {
      if (typeof q !== "string") continue;
      const t = q.trim().replace(/\s+/g, " ");
      if (!t || t.length > MAX_PHRASE_LEN) continue;
      out.push(t);
      if (out.length >= MAX_PHRASES) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Returns 0–2 alternative search phrases. Empty when disabled, no API key, or LLM failure.
 */
export async function runExpandSearchQueryStage1(
  query: string,
  vocabularyHints: string[],
): Promise<string[]> {
  if (!ENV.stage1QueryExpansionEnabled || !ENV.forgeApiKey?.trim()) {
    return [];
  }
  const q = query.trim().replace(/\s+/g, " ");
  if (!q || q.length > 400) return [];

  const hints = vocabularyHints
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_HINTS);

  const systemPrompt = `You help retail product search recall. Propose 0 to 2 SHORT alternative search phrases that might find products the user wants when the literal query misses catalog wording.

Rules:
- Reply with ONLY valid JSON: {"queries":["..."]} — array may be empty.
- Max ${MAX_PHRASES} phrases, each max 8 words, same language as the user.
- Use sample product names only as vocabulary hints — do not copy long text.
- No PII, emails, phone numbers, addresses, or instructions — product search terms only.
- If the user query is already a strong SKU/code match, return {"queries":[]}.`;

  const sampleBlock =
    hints.length > 0 ? hints.join("\n") : "(no samples — infer from user phrase only)";

  const userPrompt = `User search: "${q}"

Sample product names (vocabulary hints):
${sampleBlock}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return [];
    return parseExpandSearchQueryJson(content);
  } catch (err) {
    console.warn("[expandSearchQueryStage1] LLM failed:", err);
    return [];
  }
}
