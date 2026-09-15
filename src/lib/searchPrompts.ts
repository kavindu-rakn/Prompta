/**
 * Client-side prompt search.
 *
 * This runs over prompts the browser has already loaded. That makes it instant,
 * needs no database changes, and cannot widen access: it only ever sees rows RLS
 * already returned. It works because the app loads every prompt at once. If
 * prompts ever load in pages, search has to move into the database (Postgres
 * full-text search), because a page only knows about the prompts on it.
 *
 * Kept free of imports so it can be exercised directly in Node.
 */

// Combining diacritical marks, which NFKD splits off from accented letters.
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases, strips accents and folds compatibility forms, so "resume" finds
 * "Résumé" and a full-width "ＡＰＩ" finds "api".
 */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
}

/** Splits a query into terms. A prompt matches when every term appears, in any order. */
export function parseQuery(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

/**
 * Builds the searchable text for one prompt. Build it once per prompt when the
 * data loads, not once per keystroke: normalising up to 100,000 characters per
 * prompt on every key press is where the time would go.
 *
 * Fields are joined with a newline. Terms never contain whitespace, so a term
 * can never falsely match across the boundary between two fields.
 */
export function buildHaystack(fields: Array<string | null | undefined>): string {
  return normalizeForSearch(fields.filter(Boolean).join("\n"));
}

/**
 * Plain substring checks, not regular expressions, so queries like "c++" or
 * "(draft" are matched literally.
 */
export function matchesTerms(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}
