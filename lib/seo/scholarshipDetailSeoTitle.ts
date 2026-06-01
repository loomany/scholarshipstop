export type ScholarshipDetailTitleFacts = {
  title?: string | null;
  provider?: string | null;
  deadlineBucket?: string | null;
  daysUntilDeadline?: number | null;
  statusText?: string | null;
};

const MAX_TITLE_LENGTH = 85;
const CURRENT_YEAR = new Date().getUTCFullYear();
const DETAIL_TITLE_SUFFIX =
  ': Eligibility, Deadline & How to Apply | ScholarshipTop';

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
  const hasDeadlineContext =
    Boolean(normalizeTitlePart(scholarship.deadlineBucket)) ||
    Boolean(normalizeTitlePart(scholarship.statusText)) ||
    scholarship.daysUntilDeadline != null;

  if (!hasDeadlineContext) {
    const simpleTitle = `${base} | ScholarshipTop`;
    return simpleTitle.length <= MAX_TITLE_LENGTH
      ? simpleTitle
      : truncateWithSuffix(base, ' | ScholarshipTop');
  }

  const baseWithYear = /\b20\d{2}\b/.test(base)
    ? base
    : `${base} ${CURRENT_YEAR}`;
  const candidates = [
    `${baseWithYear}${DETAIL_TITLE_SUFFIX}`,
    `${base}: Eligibility, Deadline & How to Apply | ScholarshipTop`,
    `${base} | ScholarshipTop`
  ];

  const fit = candidates.find(
    (candidate) => candidate.length <= MAX_TITLE_LENGTH
  );
  if (fit) return fit;
  return truncateWithSuffix(baseWithYear, DETAIL_TITLE_SUFFIX);
}
