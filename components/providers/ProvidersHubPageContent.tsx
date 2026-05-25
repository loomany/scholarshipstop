import Link from 'next/link';
import dynamic from 'next/dynamic';
import { permanentRedirect, redirect } from 'next/navigation';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import { HubIqPromoAssessmentCard } from '@/components/i18n/HubIqPromoAssessmentCard';
import { ProvidersHubCardsGrid } from '@/components/providers/ProvidersHubCardsGrid';
import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import { fetchProviderHubListing } from '@/lib/providers/providerHubServer';
import type { ProvidersHubSearchParams } from '@/lib/providers/providersHubSearchParams';
import { parseProvidersHubListingInputs } from '@/lib/providers/providersHubSearchParams';
import {
  buildProvidersHubHref,
  PROVIDERS_HUB_PAGE_SIZE
} from '@/lib/providers/providersHubUrl';
import {
  SEO_ROUTE_STATE_CODE_TO_SLUG,
  SEO_ROUTE_STATE_SLUG_TO_CODE
} from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { getURL } from '@/utils/helpers';
import { getProvidersHubUiCopy, type ProvidersHubUiCopy } from '@/lib/i18n/hubUiCopy';
import { getProviderCardUiCopy } from '@/lib/i18n/providerDisplayLabels';
import { getProvidersHubIqPromoCopy } from '@/lib/i18n/hubIqPromoByHub';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

/**
 * `useSearchParams` in the toolbar can hit the same Turbopack SSR pitfall as
 * `usePathname` in Navlinks вЂ” load client-only (see `components/ui/Navbar/Navbar.tsx`).
 */
const ProvidersHubToolbarClient = dynamic(
  () =>
    import('@/components/providers/ProvidersHubToolbar').then((m) => ({
      default: m.ProvidersHubToolbar
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        aria-busy="true"
        aria-label="Loading search"
      >
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="h-[3.25rem] flex-1 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-10 w-full shrink-0 animate-pulse rounded-xl bg-zinc-100 sm:w-[11rem]" />
        </div>
      </div>
    )
  }
);


export type ProvidersHubPageContentProps = {
  searchParams: ProvidersHubSearchParams;
  /** USPS code when on `/providers/{slug}`; empty on national hub. */
  pathStateCode: string;
  /** Lowercase SEO slug for path; null on national hub. */
  stateSlug: string | null;
  locale?: Stage2PilotLocale | 'en';
  ui?: ProvidersHubUiCopy;
};

export async function ProvidersHubPageContent({
  searchParams,
  pathStateCode,
  stateSlug,
  locale = 'en',
  ui: uiProp
}: ProvidersHubPageContentProps) {
  const ui = uiProp ?? getProvidersHubUiCopy(locale);
  const providerCardCopy = getProviderCardUiCopy(locale);
  const iqCopy = getProvidersHubIqPromoCopy(locale);
  const hrefForPath = (path: string) => hrefForLocalizedUiRequired(locale, path);
  const iqProviderResearchHref = '/iq/assessment?intent=provider_research';
  const { q, countryBucket, stateCode, currentPage } =
    parseProvidersHubListingInputs(searchParams, pathStateCode);

  // One-word "search" that is a state slug в†’ canonical state hub (not e.g. /providers/florida?q=texas).
  const qTrim = q?.trim();
  if (pathStateCode && qTrim && !qTrim.includes(' ')) {
    const codeFromQuery = SEO_ROUTE_STATE_SLUG_TO_CODE[qTrim.toLowerCase()];
    if (codeFromQuery) {
      permanentRedirect(
        buildProvidersHubHref({
          state: codeFromQuery,
          country: countryBucket,
          page: currentPage > 1 ? currentPage : undefined
        })
      );
    }
  }

  const { rows, total } = await fetchProviderHubListing({
    qRaw: q,
    stateRaw: stateCode || undefined,
    country: countryBucket,
    page: currentPage,
    pageSize: PROVIDERS_HUB_PAGE_SIZE
  });

  const totalPages =
    total === 0 ? 1 : Math.ceil(total / PROVIDERS_HUB_PAGE_SIZE);

  if (total > 0 && currentPage > totalPages) {
    redirect(
      buildProvidersHubHref({
        q: q ?? undefined,
        state: stateCode || undefined,
        country: countryBucket,
        page: totalPages
      })
    );
  }

  const stateName =
    stateCode && US_STATE_CODE_TO_NAME[stateCode]
      ? US_STATE_CODE_TO_NAME[stateCode]
      : null;

  const listingBasePath =
    stateSlug && stateCode && countryBucket !== 'other'
      ? `/providers/${encodeURIComponent(stateSlug)}`
      : '/providers';

  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * PROVIDERS_HUB_PAGE_SIZE + 1;
  const showingTo =
    total === 0
      ? 0
      : Math.min(currentPage * PROVIDERS_HUB_PAGE_SIZE, total);

  const buildPageHref = (page: number) =>
    hrefForPath(
      buildProvidersHubHref({
        q: q ?? undefined,
        state: stateCode || undefined,
        country: countryBucket,
        page
      })
    );

  const countrySummary =
    countryBucket === 'us'
      ? ui.countryOptions.find((o) => o.value === 'us')?.label ?? null
      : countryBucket === 'other'
        ? ui.countryOptions.find((o) => o.value === 'other')?.label ?? null
        : null;

  const resetHref =
    stateSlug && stateCode && countryBucket !== 'other'
      ? `/providers/${encodeURIComponent(stateSlug)}`
      : '/providers';

  const canonicalStateSlug =
    stateCode && SEO_ROUTE_STATE_CODE_TO_SLUG[stateCode]
      ? SEO_ROUTE_STATE_CODE_TO_SLUG[stateCode]
      : null;

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.home,
        item: getURL(hrefForPath('/').replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.breadcrumb,
        item: getURL(hrefForPath('/providers').replace(/^\/+/, ''))
      },
      ...(stateName && canonicalStateSlug
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: stateName,
              item: getURL(`providers/${canonicalStateSlug}`)
            }
          ]
        : [])
    ]
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: stateName ? `Scholarship providers in ${stateName}` : 'Scholarship Providers',
    description: stateName
      ? `Organizations and foundations with active scholarship listings tied to ${stateName}.`
      : 'Scholarship provider directory based on ScholarshipTop listing data.',
    url: getURL(listingBasePath.replace(/^\/+/, ''))
  };

  const itemListSchema =
    rows.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: stateName ? `Providers in ${stateName}` : 'Scholarship providers',
          numberOfItems: rows.length,
          itemListElement: rows.map((row, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: row.display_name?.trim() || row.slug.replace(/-/g, ' '),
            item: getURL(`providers/${encodeURIComponent(row.slug)}`)
          }))
        }
      : null;

  const h1 =
    stateName && stateSlug
      ? `Scholarship providers in ${stateName}`
      : ui.h1;
  const intro =
    stateName && stateSlug
      ? `Organizations and foundations with active scholarship listings tied to ${stateName}.`
      : ui.intro;

  return (
    <div className="bg-white text-zinc-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      {itemListSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      ) : null}
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href={hrefForPath('/')}
                className="font-medium text-zinc-600 transition hover:text-zinc-900"
              >
                {ui.home}
              </Link>
            </li>
            <li className="text-zinc-300" aria-hidden>
              /
            </li>
            {stateName && canonicalStateSlug ? (
              <>
                <li>
                  <Link
                    href={hrefForPath('/providers')}
                    className="font-medium text-zinc-600 transition hover:text-zinc-900"
                  >
                    {ui.breadcrumb}
                  </Link>
                </li>
                <li className="text-zinc-300" aria-hidden>
                  /
                </li>
                <li className="font-medium text-zinc-900" aria-current="page">
                  {stateName}
                </li>
              </>
            ) : (
              <li className="font-medium text-zinc-900" aria-current="page">
                {ui.breadcrumb}
              </li>
            )}
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <header className="max-w-3xl">
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.06]">
                {h1}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600 sm:text-xl sm:leading-relaxed">
                {intro}
              </p>
            </header>

            <p className="mt-6 text-sm text-zinc-500">
              {ui.showingProviders(showingFrom, showingTo, total, {
                query: q ?? undefined,
                stateName,
                countrySummary
              })}
            </p>

            <div className="mt-6 w-full">
              <ProvidersHubToolbarClient
                defaultQuery={q ?? ''}
                activeStateCode={stateCode}
                activeCountry={countryBucket}
                listingBasePath={listingBasePath}
                stateEncodedInPath={Boolean(
                  stateSlug && stateCode && countryBucket !== 'other'
                )}
                searchPlaceholder={ui.searchPlaceholder}
                countryOptions={ui.countryOptions}
                countriesDropdownLabel={providerCardCopy.countriesDropdown}
                loadingSearchAria={ui.loadingSearchAria}
              />
            </div>
          </div>

          <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
            <HubIqPromoAssessmentCard
              href={iqProviderResearchHref}
              iq={iqCopy}
            />
          </aside>
        </div>

        <ProviderDirectoryTrustSection
          stateName={stateName}
          hrefForPath={hrefForPath}
        />

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <p className="text-zinc-700">
              {countryBucket === 'us' && !stateName
                ? ui.emptyUs
                : stateName
                  ? ui.emptyState(stateName)
                  : countryBucket === 'other'
                    ? ui.emptyOther
                    : q?.trim()
                      ? ui.emptySearch
                      : ui.emptyDefault}
            </p>
            <Link
              href={hrefForPath(resetHref)}
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              {ui.resetFilters}
            </Link>
          </div>
        ) : (
          <>
            <ProvidersHubCardsGrid
              rows={rows}
              gridIq={ui.gridIq}
              iqHref={iqProviderResearchHref}
              locale={locale}
            />
            <div className="mt-6 lg:hidden">
              <HubIqPromoAssessmentCard
                href={iqProviderResearchHref}
                iq={iqCopy}
              />
            </div>
            <ResourcesPagination
              locale={locale}
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildPageHref}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ProviderDirectoryTrustSection({
  stateName,
  hrefForPath
}: {
  stateName: string | null;
  hrefForPath: (path: string) => string;
}) {
  const directoryLabel = stateName
    ? `provider profiles in ${stateName}`
    : 'provider profiles';

  return (
    <section
      className="mt-8 grid gap-4 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm sm:p-6 lg:grid-cols-[1.1fr_0.9fr]"
      aria-labelledby="provider-directory-trust-heading"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Scholarship provider directory
        </p>
        <h2
          id="provider-directory-trust-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-zinc-950"
        >
          Use providers to verify source context, not just names
        </h2>
        <p className="mt-3 text-sm leading-7 text-zinc-700 sm:text-base">
          ScholarshipTop builds {directoryLabel} from live listing data. When an
          official source is missing or unclear, the profile should show that
          status instead of treating the provider as fully verified.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['Verification methodology', '/scholarship-verification-methodology'],
            ['Corrections', '/corrections'],
            ['Financial aid disclaimer', '/financial-aid-disclaimer'],
            ['How recommendations work', '/how-we-rank-scholarships']
          ].map(([label, href]) => (
            <Link
              key={href}
              href={hrefForPath(href)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {[
          ['Active scholarships', 'How many live listings are connected to the provider.'],
          ['Source status', 'Whether an official URL is available or needs confirmation.'],
          ['Data completeness', 'How much public context the profile can safely show.'],
          ['Corrections path', 'Students can report broken links or inaccurate eligibility.']
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-zinc-950">{title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
