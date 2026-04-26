import type { SeoFaqItem, SeoPayload } from '@/lib/seo/seoPageContract';
import {
  normalizeSeoWhitespace,
  SEO_AUDIT_META_LENGTH,
  SEO_AUDIT_TITLE_LENGTH
} from '@/lib/seo/seoQualityRules';

function clipWithEllipsis(s: string, maxLen: number): string {
  const t = normalizeSeoWhitespace(s);
  if (t.length <= maxLen) return t;
  if (maxLen <= 1) return '…';
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function clipFaqItem(f: SeoFaqItem): SeoFaqItem {
  return {
    question: clipWithEllipsis(f.question, 500),
    answer: clipWithEllipsis(f.answer, 4000)
  };
}

/**
 * Soft length normalization for title/meta (audit allowed bands).
 * Does not rewrite factual eligibility/overview fields.
 */
export function normalizeSeoPayload(input: SeoPayload): SeoPayload {
  let title = normalizeSeoWhitespace(input.title);
  let metaDescription = normalizeSeoWhitespace(input.metaDescription);

  if (title.length > SEO_AUDIT_TITLE_LENGTH.max) {
    title = clipWithEllipsis(title, SEO_AUDIT_TITLE_LENGTH.max);
  }
  if (title.length < SEO_AUDIT_TITLE_LENGTH.min && title.length > 0) {
    // Pad lightly without inventing topic facts — suffix is generic.
    const pad = ' — Scholarship guide';
    title = normalizeSeoWhitespace(`${title}${pad}`);
    if (title.length > SEO_AUDIT_TITLE_LENGTH.max) {
      title = clipWithEllipsis(title, SEO_AUDIT_TITLE_LENGTH.max);
    }
  }

  if (metaDescription.length > SEO_AUDIT_META_LENGTH.max) {
    metaDescription = clipWithEllipsis(metaDescription, SEO_AUDIT_META_LENGTH.max);
  }
  if (
    metaDescription.length > 0 &&
    metaDescription.length < SEO_AUDIT_META_LENGTH.min
  ) {
    const pad =
      ' Details, eligibility context, and practical steps for applicants.';
    while (metaDescription.length < SEO_AUDIT_META_LENGTH.min) {
      metaDescription = normalizeSeoWhitespace(`${metaDescription}${pad}`);
    }
    if (metaDescription.length > SEO_AUDIT_META_LENGTH.max) {
      metaDescription = clipWithEllipsis(metaDescription, SEO_AUDIT_META_LENGTH.max);
    }
  }

  const faq = input.faq?.map(clipFaqItem);

  return {
    ...input,
    title,
    metaDescription,
    ...(faq ? { faq } : {})
  };
}
