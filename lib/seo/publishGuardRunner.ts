import type { SeoPayload } from '@/lib/seo/seoPageContract';
import { normalizeSeoPayload } from '@/lib/seo/normalizeSeoPayload';
import {
  appendSeoNewContentWarningRun,
  isSeoQualityWarnOnlyDefault
} from '@/lib/seo/seoNewContentWarnings';
import {
  bucketSeoPublishResult,
  seoPublishSummaryLine,
  validateSeoBeforePublish
} from '@/lib/seo/validateSeoBeforePublish';

export type SeoPublishGuardResult = {
  normalized: SeoPayload;
  validation: ReturnType<typeof validateSeoBeforePublish>;
  bucket: ReturnType<typeof bucketSeoPublishResult>;
};

/**
 * Warn-only path: never throws for SEO; logs, appends JSON tail, returns normalized payload.
 * `SEO_QUALITY_WARN_ONLY` defaults to on when unset (`!== '0'`).
 */
export async function runSeoPublishGuardWarnOnly(params: {
  source: string;
  payload: SeoPayload;
}): Promise<SeoPublishGuardResult> {
  void isSeoQualityWarnOnlyDefault(); // reserved for future strict mode; default warn-only

  const normalized = normalizeSeoPayload(params.payload);
  const validation = validateSeoBeforePublish(normalized);
  const bucket = bucketSeoPublishResult(validation);

  console.log(seoPublishSummaryLine(normalized, validation));

  const counts =
    bucket === 'ok'
      ? { ok: 1, warnings: 0, below90: 0 }
      : bucket === 'warnings'
        ? { ok: 0, warnings: 1, below90: 0 }
        : { ok: 0, warnings: 0, below90: 1 };

  await appendSeoNewContentWarningRun({
    generatedAt: new Date().toISOString(),
    source: params.source,
    counts,
    entries: [
      {
        url: normalized.url,
        type: normalized.type,
        score: validation.score,
        issues: validation.issues,
        warnings: validation.warnings
      }
    ]
  });

  return { normalized, validation, bucket };
}
