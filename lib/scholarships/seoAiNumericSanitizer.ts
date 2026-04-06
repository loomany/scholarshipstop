/**
 * AI SEO copy must not contain counts, dollar amounts, or other numeric claims —
 * those come from live listing data in React (hero subline, headers, etc.).
 */

const USD = /\$\s*[\d,]+(?:\.\d{1,2})?\b/g;
const PCT = /\b\d+(?:\.\d+)?%/g;
const COMMA_NUM = /\b\d{1,3}(?:,\d{3})+\b/g;
const INTEGER = /\b\d+\b/g;

/** Remove currency, percentages, and standalone integers from prose. */
export function stripNumericTokensFromSeoProse(text: string): string {
  if (!text?.trim()) return text;
  let t = text.replace(USD, ' ');
  t = t.replace(PCT, ' ');
  t = t.replace(COMMA_NUM, ' ');
  t = t.replace(INTEGER, ' ');
  t = t.replace(/\(\s*\)/g, '');
  t = t.replace(/\s+([.,;:!?])/g, '$1');
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/^\s*[.,;:!?]\s*/g, '').trim();
  return t;
}

/**
 * Strip trailing “: 80 opportunities”, “ — 12 scholarships”, etc. from H1/title
 * before appending a live count in the UI.
 */
export function stripNumericSuffixFromSeoHeading(raw: string): string {
  let t = raw.trim();
  t = t.replace(
    /\s*[:\u2014\u2013-]\s*[\d,]+(?:\.\d+)?\s+(opportunities?|scholarships?|listings?|matches?|programs?|awards?|options?)(?:\s+available)?\s*$/i,
    ''
  );
  t = t.replace(/\s*\(\s*[\d,]+\s*\)\s*$/, '');
  t = t.replace(/\s*:\s*[\d,]+\s*$/, '');
  return stripNumericTokensFromSeoProse(t)
    .replace(/\s+$/g, '')
    .replace(/^\s*[—–:\s]+/, '')
    .trim();
}

function mapBullets(
  v: string | string[] | undefined
): string | string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const a = v.map((x) => stripNumericTokensFromSeoProse(String(x).trim()))
      .filter(Boolean);
    return a.length ? a : undefined;
  }
  const s = stripNumericTokensFromSeoProse(String(v).trim());
  return s || undefined;
}

export type SanitizableSeoBundle = {
  seo_title: string;
  seo_description: string;
  intro: string;
  h1?: string;
  supporting?: string;
  related_intro?: string;
  how_to_use?: string | string[];
  who_for?: string | string[];
  faq?: { question: string; answer: string }[];
};

/** Apply numeric stripping to all user-facing SEO strings (read-path safety). */
export function sanitizeSeoBundleNumericClaims<T extends SanitizableSeoBundle>(
  b: T
): T {
  const faq = b.faq?.length
    ? b.faq
        .map((item) => ({
          question: stripNumericTokensFromSeoProse(item.question),
          answer: stripNumericTokensFromSeoProse(item.answer)
        }))
        .filter((item) => item.question.trim() && item.answer.trim())
    : undefined;

  return {
    ...b,
    seo_title: stripNumericTokensFromSeoProse(b.seo_title),
    seo_description: stripNumericTokensFromSeoProse(b.seo_description),
    intro: stripNumericTokensFromSeoProse(b.intro),
    h1: b.h1
      ? stripNumericSuffixFromSeoHeading(b.h1)
      : undefined,
    supporting: b.supporting
      ? stripNumericTokensFromSeoProse(b.supporting)
      : undefined,
    related_intro: b.related_intro
      ? stripNumericTokensFromSeoProse(b.related_intro)
      : undefined,
    how_to_use: mapBullets(b.how_to_use) as T['how_to_use'],
    who_for: mapBullets(b.who_for) as T['who_for'],
    faq
  };
}
