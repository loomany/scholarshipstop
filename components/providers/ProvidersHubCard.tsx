'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';
import { formatProviderHqLocationLine } from '@/lib/providers/providerHubRegionLabel';
import {
  getProviderSeoQualityPolicy
} from '@/lib/seo/providerSeoQualityPolicy';
import { extractLocaleFromPath } from '@/lib/i18n/paths';
import {
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import {
  getLocalizedProviderDataCompletenessLabel,
  getLocalizedProviderSourceStatusLabel,
  getProviderCardUiCopy
} from '@/lib/i18n/providerDisplayLabels';

function cardTitle(row: ProviderHubRow): string {
  const n = row.display_name?.trim();
  if (n) return n;
  return row.slug.replace(/-/g, ' ');
}

function descriptionSnippet(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

type Props = {
  row: ProviderHubRow;
  locale?: LocalizedUiLocale;
};

export function ProvidersHubCard({ row, locale: localeProp }: Props) {
  const pathname = usePathname() ?? '';
  const locale = useMemo((): LocalizedUiLocale => {
    if (localeProp) return localeProp;
    const fromPath = extractLocaleFromPath(pathname);
    if (fromPath && isStage2PilotLocale(fromPath)) return fromPath;
    return 'en';
  }, [localeProp, pathname]);
  const copy = getProviderCardUiCopy(locale);

  const title = cardTitle(row);
  const count = row.scholarship_count ?? 0;
  const href = hrefForLocalizedUiRequired(
    locale,
    `/providers/${encodeURIComponent(row.slug)}`
  );
  const locationLine = formatProviderHqLocationLine(row.state);
  const snippet = descriptionSnippet(row.ai_description);
  const headingId = `provider-hub-card-title-${row.slug}`;
  const quality = getProviderSeoQualityPolicy({
    slug: row.slug,
    displayName: title,
    activeScholarshipCount: count,
    officialUrl: row.official_url,
    hasDescription: Boolean(snippet),
    hasPublicScholarshipList: count > 0,
    hasSourceTrustContext: true,
    routeResolves: true
  });

  const activeScholarshipsBadge = (
    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-right text-[10px] font-semibold leading-none text-emerald-600 ring-1 ring-emerald-100 sm:px-3 sm:text-xs sm:text-left">
      {count.toLocaleString()}{' '}
      {count === 1 ? copy.activeScholarship : copy.activeScholarships}
    </span>
  );

  return (
    <li className="h-full">
      <Link
        href={href}
        aria-labelledby={headingId}
        className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm outline-none transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 sm:p-8"
      >
        <article className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            {locationLine ? (
              <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase leading-snug tracking-wider text-zinc-500">
                {locationLine}
              </p>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden />
            )}
            {activeScholarshipsBadge}
          </div>
          <h2
            id={headingId}
            className="mt-3 line-clamp-2 text-left text-xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-2xl sm:leading-snug"
          >
            {title}
          </h2>
          {snippet ? (
            <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-relaxed">
              {snippet}
            </p>
          ) : (
            <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              {copy.profilePending}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {getLocalizedProviderSourceStatusLabel(
                quality.sourceStatus,
                locale
              )}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {getLocalizedProviderDataCompletenessLabel(
                quality.dataCompleteness,
                locale
              )}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {row.is_enriched ? copy.profileEnriched : copy.notManuallyReviewed}
            </span>
          </div>
          <span className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-orange-600 transition group-hover:border-zinc-300 group-hover:bg-zinc-50 group-hover:text-orange-700">
            {copy.viewProfile}
          </span>
        </article>
      </Link>
    </li>
  );
}
