import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import { ProvidersHubBulkEnrichButton } from '@/components/providers/ProvidersHubBulkEnrichButton';
import { ProvidersHubCardsGrid } from '@/components/providers/ProvidersHubCardsGrid';
import { ProvidersHubToolbar } from '@/components/providers/ProvidersHubToolbar';
import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import {
  countUnenrichedProviders,
  fetchProviderHubListing,
  isProvidersBulkEnrichUiEnabled,
  parseProvidersHubStateParam
} from '@/lib/providers/providerHubServer';
import {
  buildProvidersHubHref,
  parseProvidersHubPageParam,
  PROVIDERS_HUB_PAGE_SIZE
} from '@/lib/providers/providersHubUrl';
import { getURL } from '@/utils/helpers';
import { getCanonical } from '@/lib/seo/canonical';

export const dynamic = 'force-dynamic';

const baseDescription =
  'Explore organizations and foundations offering financial aid across the United States.';
const baseTitle = 'Scholarship Providers';

export type ProvidersHubSearchParams = {
  q?: string | string[];
  state?: string | string[];
  page?: string | string[];
  sort?: string | string[];
};

function searchQueryFromParams(q: string | string[] | undefined): string | undefined {
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && q[0]) return q[0];
  return undefined;
}

/** Clean `/providers` hub (no filters / pagination / sort) — indexable with canonical `/providers`. */
function providersHubIsCanonicalListingView(
  searchParams: ProvidersHubSearchParams | undefined
): boolean {
  if (!searchParams) return true;
  const allowed = new Set(['q', 'state', 'page', 'sort']);
  for (const key of Object.keys(searchParams)) {
    if (!allowed.has(key)) return false;
  }
  const q = searchQueryFromParams(searchParams.q);
  const stateCode =
    parseProvidersHubStateParam(searchParams.state) ?? '';
  const page = parseProvidersHubPageParam(searchParams.page);
  const sortRaw =
    typeof searchParams.sort === 'string'
      ? searchParams.sort
      : Array.isArray(searchParams.sort)
        ? searchParams.sort[0]
        : undefined;
  if (q?.trim()) return false;
  if (stateCode) return false;
  if (page > 1) return false;
  if (sortRaw?.trim()) return false;
  return true;
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: ProvidersHubSearchParams;
}): Promise<Metadata> {
  const canonicalUrl = getCanonical('/providers');
  const isCanonicalListing = providersHubIsCanonicalListingView(searchParams);
  return {
    title: baseTitle,
    description: baseDescription,
    alternates: { canonical: canonicalUrl },
    ...(isCanonicalListing
      ? {}
      : { robots: { index: false, follow: true } }),
    openGraph: {
      title: baseTitle,
      description: baseDescription,
      url: canonicalUrl,
      type: 'website'
    }
  };
}

type PageProps = {
  searchParams: ProvidersHubSearchParams;
};

export default async function ProvidersHubPage({ searchParams }: PageProps) {
  const q = searchQueryFromParams(searchParams.q);
  const stateCode = parseProvidersHubStateParam(searchParams.state) ?? '';
  const currentPage = parseProvidersHubPageParam(searchParams.page);

  const { rows, total } = await fetchProviderHubListing({
    qRaw: q,
    stateRaw: stateCode || undefined,
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
        page: totalPages
      })
    );
  }

  const bulkUi = isProvidersBulkEnrichUiEnabled();
  const pendingEnrich = bulkUi ? await countUnenrichedProviders() : 0;

  const stateName =
    stateCode && US_STATE_CODE_TO_NAME[stateCode]
      ? US_STATE_CODE_TO_NAME[stateCode]
      : null;

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
      page
    });

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: getURL('/') },
      { '@type': 'ListItem', position: 2, name: 'Providers', item: getURL('/providers') }
    ]
  };

  return (
    <div className="bg-white text-zinc-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
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
            <li className="font-medium text-zinc-900" aria-current="page">
              Providers
            </li>
          </ol>
        </nav>

        <header className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.06]">
            Scholarship Providers
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600 sm:text-xl sm:leading-relaxed">
            Explore organizations and foundations offering financial aid across the
            United States.
          </p>
        </header>

        <p className="mt-6 text-sm text-zinc-500">
          Showing {showingFrom}-{showingTo} of {total.toLocaleString()} providers
          {q?.trim() ? ` matching “${q.trim()}”` : ''}
          {stateName ? ` in ${stateName}` : ''}
        </p>

        <div className="mt-6 w-full">
          <ProvidersHubToolbar
            defaultQuery={q ?? ''}
            activeStateCode={stateCode}
          />
        </div>

        {bulkUi ? (
          <div className="mt-10 max-w-3xl">
            <ProvidersHubBulkEnrichButton pendingCount={pendingEnrich} />
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <p className="text-zinc-700">
              {stateName
                ? `No providers found in ${stateName}.`
                : q?.trim()
                  ? 'No providers match your search.'
                  : 'No providers found.'}
            </p>
            <Link
              href="/providers"
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Reset filters
            </Link>
          </div>
        ) : (
          <>
            <ProvidersHubCardsGrid rows={rows} />
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
