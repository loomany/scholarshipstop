import type { RelatedScholarshipStored, ScoredScholarshipMatch } from './types';

const REASONS = [
  'Relevant to this article',
  'Good fit for this topic',
  'Related scholarship'
];

function reasonAt(i: number): string {
  return REASONS[i % REASONS.length] ?? 'Related scholarship';
}

function toStored(
  m: ScoredScholarshipMatch,
  i: number
): RelatedScholarshipStored {
  const title = m.row.title?.trim() || 'Scholarship';
  return {
    slug: m.row.slug.trim(),
    title,
    score: m.score,
    reason: reasonAt(i),
    award_amount_text: m.row.award_amount_text?.trim() || null,
    deadline_text: m.row.deadline_text?.trim() || null
  };
}

const STRONG_MIN = 12;
const WEAK_MIN = 7;
const MAX_STRONG = 6;
const MAX_WEAK = 3;

/** Strong matches first (up to 6); else up to 3 weaker “reasonable” matches. */
export function selectRelatedScholarshipsForArticle(
  ranked: ScoredScholarshipMatch[]
): RelatedScholarshipStored[] {
  const strong = ranked
    .filter((m) => m.score >= STRONG_MIN)
    .slice(0, MAX_STRONG)
    .map((m, i) => toStored(m, i));
  if (strong.length > 0) return strong;

  return ranked
    .filter((m) => m.score >= WEAK_MIN)
    .slice(0, MAX_WEAK)
    .map((m, i) => toStored(m, i));
}
