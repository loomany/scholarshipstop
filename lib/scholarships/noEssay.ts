export const EXPLICIT_NO_ESSAY_RE =
  /\bno[-\s]+essay\b|\bwithout\s+an\s+essay\b|\bessay\s+not\s+required\b/i;

export function hasExplicitNoEssaySignal(text: string): boolean {
  return EXPLICIT_NO_ESSAY_RE.test(text);
}

export const NO_ESSAY_SQL_PARTS = [
  /**
   * Keep listing SQL index-friendly. The previous ILIKE scan over title /
   * description / requirements_text_clean caused statement timeouts on the
   * public safe listing after the catalog grew and description gained watermark
   * HTML. `easy_apply_flags` is backed by a GIN index.
   */
  'easy_apply_flags.cs.["no_essay"]'
] as const;
