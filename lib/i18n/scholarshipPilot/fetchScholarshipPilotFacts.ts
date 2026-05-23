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

/** Strip scraped DAAD / catalog boilerplate; keep the human-readable deadline line only. */
export function sanitizePilotDeadlineText(raw: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const stopMarkers = [
    /\bApplication requirements\b/i,
    /\bApplication Requirements\b/i,
    /\bPlease select your status\b/i,
    /\bCopy this link:\b/i,
    /\bPrint as PDF\b/i,
    /\bContact E-Mail:\b/i,
    /\bWeblink\b/i,
    /\bMore Information\b/i,
    /\bYour status and\/or country is not in the list\b/i
  ];
  for (const re of stopMarkers) {
    const idx = text.search(re);
    if (idx > 12) {
      text = text.slice(0, idx).trim();
      break;
    }
  }

  if (text.length > 160) {
    const cut = text.slice(0, 160);
    const lastSpace = cut.lastIndexOf(' ');
    text = `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }

  return text;
}

export function formatScholarshipDeadline(row: ScholarshipDbFactRow): string {
  const text = row.deadline_text?.trim();
  if (text) {
    const sanitized = sanitizePilotDeadlineText(text);
    if (sanitized) return sanitized;
  }
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
