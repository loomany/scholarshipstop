import type { ResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

const SAME_DAY_MS = 24 * 60 * 60 * 1000;

function intlLocale(locale: LocalizedUiLocale | 'en'): string {
  if (locale === 'es') return 'es-ES';
  if (locale === 'fr') return 'fr-FR';
  return 'en-US';
}

export function formatResourceArticleDate(
  iso: string | null | undefined,
  locale: LocalizedUiLocale | 'en'
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function resourceArticleDateLine(
  {
    publishedAt,
    updatedAt
  }: {
    publishedAt: string | null | undefined;
    updatedAt: string | null | undefined;
  },
  labels: Pick<ResourceDetailUiCopy, 'publishedLabel' | 'updatedLabel'>,
  locale: LocalizedUiLocale | 'en'
): string | null {
  const publishedLabel = formatResourceArticleDate(publishedAt, locale);
  const updatedLabel = formatResourceArticleDate(updatedAt, locale);
  if (!publishedLabel && !updatedLabel) return null;

  const publishedMs = publishedAt ? new Date(publishedAt).getTime() : NaN;
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const updatedIsDistinct =
    Number.isFinite(publishedMs) &&
    Number.isFinite(updatedMs) &&
    Math.abs(updatedMs - publishedMs) > SAME_DAY_MS;

  if (publishedLabel && updatedLabel && updatedIsDistinct) {
    return `${labels.publishedLabel} ${publishedLabel} · ${labels.updatedLabel} ${updatedLabel}`;
  }
  if (publishedLabel) return `${labels.publishedLabel} ${publishedLabel}`;
  return updatedLabel ? `${labels.updatedLabel} ${updatedLabel}` : null;
}
