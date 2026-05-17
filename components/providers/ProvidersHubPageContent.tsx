import Link from 'next/link';
import dynamic from 'next/dynamic';
import { permanentRedirect, redirect } from 'next/navigation';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
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

/**
 * `useSearchParams` in the toolbar can hit the same Turbopack SSR pitfall as
 * `usePathname` in Navlinks — load client-only (see `components/ui/Navbar/Navbar.tsx`).
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

function ProvidersIqAssessmentCard() {
  return (
    <Link
      href="/iq/assessment?intent=provider_research"
      aria-label="Start IQ assessment"
      className="group relative block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.58)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(234,88,12,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 lg:min-h-[13.25rem]"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#FF7A1A]/16 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-full min-w-0 flex-col justify-between pl-1">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
              Featured Tool
            </span>
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              IQ
            </span>
          </div>
          <p className="text-xl font-semibold leading-snug tracking-tight text-slate-950">
            Choose providers that fit your strategy
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Use your Brain Archetype to understand how you evaluate awards,
            deadlines, and application complexity before prioritizing providers.
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-orange-100 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Assessment
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 transition group-hover:text-[#B45309]">
            Start IQ test
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export type ProvidersHubPageContentProps = {
  searchParams: ProvidersHubSearchParams;
  /** USPS code when on `/providers/{slug}`; empty on national hub. */
  pathStateCode: string;
  /** Lowercase SEO slug for path; null on national hub. */
  stateSlug: string | null;
};

export async function ProvidersHubPageContent({
  searchParams,
  pathStateCode,
  stateSlug
}: ProvidersHubPageContentProps) {
  const { q, countryBucket, stateCode, currentPage } =
    parseProvidersHubListingInputs(searchParams, pathStateCode);

  // One-word "search" that is a state slug → canonical state hub (not e.g. /providers/florida?q=texas).
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
    buildProvidersHubHref({
      q: q ?? undefined,
      state: stateCode || undefined,
      country: countryBucket,
      page
    });

  const countrySummary =
    countryBucket === 'us'
      ? 'United States only'
      : countryBucket === 'other'
        ? 'outside US / unknown region'
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: getURL('/') },
      { '@type': 'ListItem', position: 2, name: 'Providers', item: getURL('/providers') },
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
      : 'Scholarship Providers';
  const intro =
    stateName && stateSlug
      ? `Organizations and foundations with active scholarship listings tied to ${stateName}.`
      : 'Explore organizations and foundations offering financial aid across the United States.';

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
                href="/"
                className="font-medium text-zinc-600 transition hover:text-zinc-900"
              >
                Home
              </Link>
            </li>
            <li className="text-zinc-300" aria-hidden>
              /
            </li>
            {stateName && canonicalStateSlug ? (
              <>
                <li>
                  <Link
                    href="/providers"
                    className="font-medium text-zinc-600 transition hover:text-zinc-900"
                  >
                    Providers
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
                Providers
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
              Showing {showingFrom}-{showingTo} of {total.toLocaleString()} providers
              {q?.trim() ? ` matching “${q.trim()}”` : ''}
              {stateName ? ` in ${stateName}` : ''}
              {countrySummary ? ` · ${countrySummary}` : ''}
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
              />
            </div>
          </div>

          <aside className="min-w-0 lg:pt-8" aria-label="Cognitive assessment">
            <ProvidersIqAssessmentCard />
          </aside>
        </div>

        <ProviderDirectoryTrustSection stateName={stateName} />

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <p className="text-zinc-700">
              {countryBucket === 'us' && !stateName
                ? 'No US providers match these filters.'
                : stateName
                  ? `No providers found in ${stateName}.`
                  : countryBucket === 'other'
                    ? 'No providers in this category yet.'
                    : q?.trim()
                      ? 'No providers match your search.'
                      : 'No providers found.'}
            </p>
            <Link
              href={resetHref}
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Reset filters
            </Link>
          </div>
        ) : (
          <>
            <ProvidersHubCardsGrid rows={rows} />
            <div className="mt-6 lg:hidden">
              <ProvidersIqAssessmentCard />
            </div>
            <ResourcesPagination
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

function ProviderDirectoryTrustSection({ stateName }: { stateName: string | null }) {
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
              href={href}
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
