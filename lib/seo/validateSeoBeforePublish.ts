import type { SeoPayload } from '@/lib/seo/seoPageContract';
import {
  isMetaLengthAuditOk,
  isMetaLengthIdeal,
  isTitleLengthAuditOk,
  isTitleLengthIdeal,
  normalizeSeoWhitespace,
  seoTextLength
} from '@/lib/seo/seoQualityRules';

export type SeoPublishValidation = {
  ok: boolean;
  score: number;
  issues: string[];
  warnings: string[];
};

/**
 * Lightweight pre-publish check (independent from `scripts/audit-seo-pages.ts` scoring).
 * Bucketing for logging: ok = score>=90 && warnings.length===0; warnings = score>=90 && warnings>0; below90 = score<90.
 */
export function validateSeoBeforePublish(payload: SeoPayload): SeoPublishValidation {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const title = normalizeSeoWhitespace(payload.title);
  const meta = normalizeSeoWhitespace(payload.metaDescription);

  if (!title) {
    issues.push('title_empty');
    score -= 40;
  } else if (!isTitleLengthAuditOk(title)) {
    issues.push('title_length_out_of_audit_range');
    score -= 25;
  } else if (!isTitleLengthIdeal(title)) {
    warnings.push('title_length_not_ideal_band');
    score -= 3;
  }

  if (!meta) {
    issues.push('meta_empty');
    score -= 40;
  } else if (!isMetaLengthAuditOk(meta)) {
    issues.push('meta_length_out_of_audit_range');
    score -= 25;
  } else if (!isMetaLengthIdeal(meta)) {
    warnings.push('meta_length_not_ideal_band');
    score -= 3;
  }

  score = Math.max(0, Math.min(100, score));

  const ok = issues.length === 0;
  return { ok, score, issues, warnings };
}

export function bucketSeoPublishResult(v: SeoPublishValidation): 'ok' | 'warnings' | 'below90' {
  if (v.score < 90) return 'below90';
  if (v.warnings.length > 0) return 'warnings';
  return 'ok';
}

export function seoPublishSummaryLine(payload: SeoPayload, v: SeoPublishValidation): string {
  const b = bucketSeoPublishResult(v);
  return `[seo-publish-guard] url=${payload.url} type=${payload.type} bucket=${b} score=${v.score} issues=${v.issues.join(';') || '-'} warnings=${v.warnings.join(';') || '-'}`;
}
