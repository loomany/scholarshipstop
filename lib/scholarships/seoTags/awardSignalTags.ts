/**
 * Listing SQL treats rows with NULL `award_amount_numeric_sort` as excluded unless
 * `payout_method = non_monetary` or amount falls in slider bounds. High-value awards
 * described without dollar amounts (e.g. “full ride”) use canonical `award_signal_*`
 * tags so they still match catalog filters.
 */

import type { SeoCanonicalTag } from '@/lib/scholarships/seoTags/vocabulary';

/**
 * Any overlap with these tags bypasses the amount-range leg of `applyMoreFilters` (PostgREST `ov`).
 * Parser: `award_signal_high_value` (full-ride text), `award_signal_listing_eligible` (catalog OK without $).
 */
export const AWARD_SIGNAL_SEO_TAGS: readonly SeoCanonicalTag[] = [
  'award_signal_high_value',
  'award_signal_listing_eligible'
];

export function awardPrimaryTextHasExplicitMonetaryDigits(
  text: string | null | undefined
): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (/\$\s*[\d,]+/.test(t)) return true;
  if (/\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/.test(t)) return true;
  return false;
}

const HIGH_VALUE_PATTERNS: RegExp[] = [
  /\bfull[-\s]*ride\b/i,
  /\bfull[-\s]+tuition\b/i,
  /\bfull\s+cost\s+of\s+attendance\b/i,
  /\bfull\s+scholarship\b/i,
  /\btuition[-\s]*free\b/i,
  /\b100%\s+of\s+tuition\b/i,
  /\bcovers\s+full\s+(?:tuition|cost)/i
];

/**
 * Same semantics as parsers: “HIGH_VALUE_AWARD” — high-impact wording without a parseable dollar line.
 */
export function shouldTagAwardSignalHighValue(parts: {
  award_amount_text?: string | null;
  title?: string | null;
  awards_text?: string | null;
}): boolean {
  const award = (parts.award_amount_text ?? '').trim();
  if (awardPrimaryTextHasExplicitMonetaryDigits(award)) return false;
  const hay = [award, parts.title ?? '', parts.awards_text ?? '']
    .join(' \n ')
    .slice(0, 8000);
  if (awardPrimaryTextHasExplicitMonetaryDigits(hay)) return false;
  return HIGH_VALUE_PATTERNS.some((re) => re.test(hay));
}

/** Align with SQL `seo_tags.ov.{award_signal_*}` — bypass amount slider on client when tags present. */
export function scholarshipSeoTagsBypassAmountFilter(s: {
  seoTags?: string[] | null;
}): boolean {
  const tags = s.seoTags;
  if (!tags?.length) return false;
  return tags.some(
    (t) =>
      typeof t === 'string' && t.trim().toLowerCase().startsWith('award_signal_')
  );
}
