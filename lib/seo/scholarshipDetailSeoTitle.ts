export type ScholarshipDetailTitleFacts = {
  title?: string | null;
  provider?: string | null;
  deadlineBucket?: string | null;
  daysUntilDeadline?: number | null;
  statusText?: string | null;
};

const MAX_TITLE_LENGTH = 65;

function normalizeTitlePart(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function truncateWithSuffix(base: string, suffix: string): string {
  const keep = Math.max(10, MAX_TITLE_LENGTH - suffix.length);
  return `${base.slice(0, keep).trimEnd()}${suffix}`;
}

export function buildScholarshipDetailSeoTitle(
  scholarship: ScholarshipDetailTitleFacts
): string {
  const base = normalizeTitlePart(scholarship.title) || 'Scholarship';
  const provider = normalizeTitlePart(scholarship.provider);
  const candidates = [
    provider ? `${base} by ${provider} | ScholarshipTop` : '',
    `${base}: Eligibility, Deadline & Application Details`,
    `${base} | ScholarshipTop`
  ].filter(Boolean);

  const fit = candidates.find((candidate) => candidate.length <= MAX_TITLE_LENGTH);
  if (fit) return fit;
  return truncateWithSuffix(base, ' | ScholarshipTop');
}
