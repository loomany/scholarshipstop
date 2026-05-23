import type { ScholarshipPilotFacts } from '@/lib/i18n/scholarshipPilot/scholarshipPilotContentFactory';

export type ScholarshipDbFactRow = {
  slug: string;
  title: string | null;
  provider_name: string | null;
  award_amount_text: string | null;
  award_amount_min: number | null;
  award_amount_max: number | null;
  currency: string | null;
  deadline_text: string | null;
  deadline_date: string | null;
};

export function formatScholarshipAmount(row: ScholarshipDbFactRow): string {
  if (row.award_amount_text?.trim()) return row.award_amount_text.trim();
  const cur = row.currency?.trim() || 'USD';
  if (
    typeof row.award_amount_min === 'number' &&
    typeof row.award_amount_max === 'number' &&
    row.award_amount_min === row.award_amount_max
  ) {
    return `${row.award_amount_min} ${cur}`;
  }
  if (typeof row.award_amount_min === 'number' && typeof row.award_amount_max === 'number') {
    return `${row.award_amount_min}–${row.award_amount_max} ${cur}`;
  }
  if (typeof row.award_amount_min === 'number') return `${row.award_amount_min} ${cur}`;
  return 'See official source';
}

export function formatScholarshipDeadline(row: ScholarshipDbFactRow): string {
  const text = row.deadline_text?.trim();
  if (text) return text;
  if (row.deadline_date) return String(row.deadline_date).slice(0, 10);
  return 'See official source';
}

export function scholarshipRowToPilotFacts(row: ScholarshipDbFactRow): ScholarshipPilotFacts {
  const officialTitle = row.title?.trim() || row.slug;
  const provider =
    row.provider_name?.trim() || 'Provider listed on ScholarshipTop';
  return {
    officialTitle,
    provider,
    amount: formatScholarshipAmount(row),
    deadline: formatScholarshipDeadline(row)
  };
}
