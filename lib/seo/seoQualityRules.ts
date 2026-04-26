/**
 * Central SEO length / requirement policy for generators and future guardrails.
 *
 * Important:
 * - This module is NOT wired into `scripts/audit-seo-pages.ts` yet.
 * - `SEO_AUDIT_*` ranges mirror the current audit script so future integration
 *   does not silently drift from production scoring thresholds.
 *
 * Length is measured on `normalizeSeoWhitespace(input).length` (Unicode code units,
 * same practical unit as `normalizeWhitespace` in the audit script).
 */

/** Mirrors `getTitleRangeForType` in `scripts/audit-seo-pages.ts` (25–70). */
export const SEO_AUDIT_TITLE_LENGTH = { min: 25, max: 70 } as const;

/** Mirrors `getMetaRangeForType` in `scripts/audit-seo-pages.ts` (120–160). */
export const SEO_AUDIT_META_LENGTH = { min: 120, max: 160 } as const;

/** Target band for new content (stricter than audit hard fail). */
export const SEO_IDEAL_TITLE_LENGTH = { min: 30, max: 65 } as const;

/** Target band for meta (matches audit band today). */
export const SEO_IDEAL_META_LENGTH = { min: 120, max: 160 } as const;

/**
 * Relaxed meta band for generators that clip softly (e.g. legacy essay fix heuristics).
 * Not used by audit scoring.
 */
export const SEO_RELAXED_META_LENGTH = { min: 100, max: 170 } as const;

export type LengthRange = { readonly min: number; readonly max: number };

export function normalizeSeoWhitespace(input: string | null | undefined): string {
  return (input ?? '').replace(/\s+/g, ' ').trim();
}

export function seoTextLength(input: string | null | undefined): number {
  return normalizeSeoWhitespace(input).length;
}

export function isLengthInRange(len: number, range: LengthRange): boolean {
  return len >= range.min && len <= range.max;
}

export function isTitleLengthAuditOk(title: string | null | undefined): boolean {
  return isLengthInRange(seoTextLength(title), SEO_AUDIT_TITLE_LENGTH);
}

export function isMetaLengthAuditOk(meta: string | null | undefined): boolean {
  return isLengthInRange(seoTextLength(meta), SEO_AUDIT_META_LENGTH);
}

export function isTitleLengthIdeal(title: string | null | undefined): boolean {
  return isLengthInRange(seoTextLength(title), SEO_IDEAL_TITLE_LENGTH);
}

export function isMetaLengthIdeal(meta: string | null | undefined): boolean {
  return isLengthInRange(seoTextLength(meta), SEO_IDEAL_META_LENGTH);
}

export function isMetaLengthRelaxedOk(meta: string | null | undefined): boolean {
  return isLengthInRange(seoTextLength(meta), SEO_RELAXED_META_LENGTH);
}
