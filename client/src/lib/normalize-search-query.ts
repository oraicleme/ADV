/**
 * STORY-197: Single entry normalization for user-typed search strings before MiniSearch,
 * Meilisearch sub-queries, min-score heuristics, and search rules — reduces whitespace /
 * unicode drift between manual and agent paths.
 */

/**
 * - Unicode NFC (composed form)
 * - Strip zero-width / BOM characters
 * - Collapse internal whitespace to single spaces
 * - Trim ends
 *
 * Does **not** lowercase (MiniSearch tokenizer lowercases; Meilisearch Stage-1 receives
 * the same string the agent path uses after this step).
 */
export function normalizeSearchQueryForPipeline(raw: string): string {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFC');
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
