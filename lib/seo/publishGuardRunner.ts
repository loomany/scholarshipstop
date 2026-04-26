import type { SeoPayload } from '@/lib/seo/seoPageContract';
import { normalizeSeoPayload } from '@/lib/seo/normalizeSeoPayload';
import {
  appendSeoNewContentWarningRun,
  isSeoQualityWarnOnlyDefault
} from '@/lib/seo/seoNewContentWarnings';
import {
  isSeoTelegramNotifyConfigured,
  isSeoTelegramNotifyEnabled,
  sendSeoTelegramNotification
} from '@/lib/seo/seoTelegramNotify';
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

function buildTelegramReportForGuard(params: {
  counts: { ok: number; warnings: number; below90: number };
  entry: {
    url: string;
    type: string;
    score: number;
    issues: string[];
    warnings: string[];
  };
  dryRun?: boolean;
  /** When dry-run, pass true (e.g. `--notify`) to still hit Telegram. */
  notifyInDryRun?: boolean;
}): Promise<SeoTelegramNotificationReport> {
  const flagOn = isSeoTelegramNotifyEnabled();
  const credsOk = isSeoTelegramNotifyConfigured();
  const enabled = flagOn && credsOk;

  if (params.counts.warnings === 0 && params.counts.below90 === 0) {
    return Promise.resolve({
      enabled,
      sent: false,
      reason: 'all_ok'
    });
  }

  const dryBlocked = Boolean(params.dryRun && !params.notifyInDryRun);
  if (dryBlocked) {
    return Promise.resolve({
      enabled,
      sent: false,
      reason: 'dry_run'
    });
  }

  if (!flagOn) {
    return Promise.resolve({
      enabled: false,
      sent: false,
      reason: 'notify_disabled'
    });
  }

  if (!credsOk) {
    return Promise.resolve({
      enabled: false,
      sent: false,
      reason: 'missing_credentials'
    });
  }

  const level = params.counts.below90 > 0 ? 'critical' : 'warning';
  const title =
    params.counts.below90 > 0 ? '🔴 SEO Guard Alert' : '⚠️ SEO Guard Alert';

  return sendSeoTelegramNotification({
    title,
    level,
    counts: params.counts,
    entries: [params.entry]
  }).then((r) => ({
    enabled: true,
    sent: r.sent,
    reason: r.sent ? undefined : r.reason,
    sentAt: r.sent ? new Date().toISOString() : undefined
  }));
}

/**
 * Warn-only path: never throws for SEO; logs, appends JSON tail, returns normalized payload.
 * `SEO_QUALITY_WARN_ONLY` defaults to on when unset (`!== '0'`).
 */
export async function runSeoPublishGuardWarnOnly(params: {
  source: string;
  payload: SeoPayload;
  /** When true, Telegram is skipped unless `notifyInDryRun` is true. */
  dryRun?: boolean;
  notifyInDryRun?: boolean;
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

  const entry = {
    url: normalized.url,
    type: normalized.type,
    score: validation.score,
    issues: validation.issues,
    warnings: validation.warnings
  };

  const telegramNotification = await buildTelegramReportForGuard({
    counts,
    entry,
    dryRun: params.dryRun,
    notifyInDryRun: params.notifyInDryRun
  });

  await appendSeoNewContentWarningRun({
    generatedAt: new Date().toISOString(),
    source: params.source,
    counts,
    entries: [entry],
    telegramNotification
  });

  return { normalized, validation, bucket };
}
