import Link from 'next/link';
import clsx from 'clsx';

import { getCompareDetailUiCopy } from '@/lib/i18n/compareDetailUiCopy';
import {
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

function buildUniversityHubHref(
  locale: LocalizedUiLocale,
  stateSlug: string | null | undefined,
  universitySlug: string | null | undefined
) {
  const normalizedState = stateSlug?.trim();
  const normalizedUniversity = universitySlug?.trim();
  if (!normalizedState || !normalizedUniversity) return null;
  return hrefForLocalizedUiRequired(
    locale,
    `/scholarships/${encodeURIComponent(normalizedState)}/${encodeURIComponent(normalizedUniversity)}`
  );
}

export type TopScholarshipProvidersColumnProps = {
  locale?: LocalizedUiLocale;
  stateName: string;
  stateSlug: string | null | undefined;
  items: Array<Record<string, unknown>>;
  browseHref: string | null;
};

export default function TopScholarshipProvidersColumn({
  locale = 'en',
  stateName,
  stateSlug,
  items,
  browseHref
}: TopScholarshipProvidersColumnProps) {
  const ui = getCompareDetailUiCopy(locale);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        {ui.topProviders.title(stateName)}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {ui.topProviders.rankedSubtitle}
      </p>
      {browseHref ? (
        <p className="mt-3">
          <Link
            href={browseHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            {ui.topProviders.viewAllScholarships}
            <span aria-hidden>→</span>
          </Link>
        </p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => {
            const hubHref = buildUniversityHubHref(
              locale,
              stateSlug,
              typeof item['slug'] === 'string' ? item['slug'] : null
            );
            const name = String(item['name'] ?? 'Unknown');
            const grantCount = item['grant_count'];
            const grantLabel =
              typeof grantCount === 'number' && !Number.isNaN(grantCount)
                ? ui.topProviders.grantBadge(Math.round(grantCount))
                : '—';
            return (
              <li
                key={`${String(item['slug'] ?? item['name'])}-${index}`}
                className={clsx(
                  'flex items-center justify-between gap-3 rounded-lg border p-3 transition',
                  'hover:border-gray-300 hover:shadow-sm',
                  index === 0
                    ? 'border-orange-200 bg-orange-50/90 hover:bg-orange-50 hover:border-orange-300'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="inline-flex min-w-[1.75rem] shrink-0 justify-center text-sm font-semibold tabular-nums text-gray-400"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  {hubHref ? (
                    <Link
                      href={hubHref}
                      className="min-w-0 flex-1 text-sm font-medium text-gray-900 underline decoration-orange-400/45 underline-offset-2 transition hover:text-orange-800 hover:decoration-orange-600"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                      {name}
                    </span>
                  )}
                </div>
                <span className="inline-flex min-w-[4.5rem] shrink-0 justify-end text-right sm:min-w-[5rem]">
                  <span className="min-w-[2.5rem] rounded px-2 py-1 text-xs font-semibold tabular-nums bg-orange-100 text-orange-600">
                    {grantLabel}
                  </span>
                </span>
              </li>
            );
          })
        ) : (
          <li className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
            {ui.topProviders.noData}
          </li>
        )}
      </ul>
    </div>
  );
}
