export const EXPLICIT_NO_ESSAY_RE =
  /\bno[-\s]+essay\b|\bwithout\s+an\s+essay\b|\bessay\s+not\s+required\b/i;

export function hasExplicitNoEssaySignal(text: string): boolean {
  return EXPLICIT_NO_ESSAY_RE.test(text);
}

export const NO_ESSAY_SQL_PARTS = [
  'title.ilike.%no essay%',
  'title.ilike.%no-essay%',
  'title.ilike.%without an essay%',
  'title.ilike.%essay not required%',
  'description.ilike.%no essay%',
  'description.ilike.%no-essay%',
  'description.ilike.%without an essay%',
  'description.ilike.%essay not required%',
  'requirements_text_clean.ilike.%no essay%',
  'requirements_text_clean.ilike.%no-essay%',
  'requirements_text_clean.ilike.%without an essay%',
  'requirements_text_clean.ilike.%essay not required%'
] as const;
