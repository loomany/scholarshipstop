import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { ArrowRight, BrainCircuit, Check } from 'lucide-react';
import type { Metadata } from 'next';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import ProviderProfilePageAuthBridge from '@/app/providers/ProviderProfilePageAuthBridge';
import { ProviderProfileContextLinks } from '@/components/providers/ProviderProfileContextLinks';
import { ProviderProfileTableOfContents } from '@/components/providers/ProviderProfileTableOfContents';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import { ProviderOfficialWebsiteGate } from '@/components/providers/ProviderOfficialWebsiteGate';
import { ProviderProfileScholarshipsScroll } from '@/components/providers/ProviderProfileScholarshipsScroll';
import { ProvidersHubPageContent } from '@/components/providers/ProvidersHubPageContent';
import ProviderScholarshipMatchCta from '@/components/providers/ProviderScholarshipMatchCta';
import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import {
  getCachedProviderProfilePage,
  resolveProviderProfileSlug
} from '@/lib/providers/providerProfileServer';
import { formatProviderHqLocationLine } from '@/lib/providers/providerHubRegionLabel';
import type { ProvidersHubSearchParams } from '@/lib/providers/providersHubSearchParams';
import {
  parseProvidersHubListingInputs,
  providersHubStatePathIsSeoIndexable
} from '@/lib/providers/providersHubSearchParams';
import { buildProvidersHubHref } from '@/lib/providers/providersHubUrl';
import { getProvidersHubStateCodeFromPathSegment } from '@/lib/providers/providersHubStatePath';
import { SEO_ROUTE_STATE_CODE_TO_SLUG } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { getURL } from '@/utils/helpers';
import {
  buildProviderProfileScholarshipsHref,
  parseProviderProfilePageParam,
  PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
} from '@/lib/providers/providerProfilePagination';
import { getCanonical } from '@/lib/seo/canonical';
import {
  getProviderSeoQualityPolicy,
  type ProviderDataCompleteness,
  type ProviderSourceStatus
} from '@/lib/seo/providerSeoQualityPolicy';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import {
  getProviderContextLinkItems,
  getProviderDetailUiCopy
} from '@/lib/i18n/providerDetailUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getLocalizedProviderDataCompletenessLabel,
  getLocalizedProviderSourceStatusLabel
} from '@/lib/i18n/providerDisplayLabels';

export const revalidate = 60;

function providerMetaDescription(
  aiDescription: string | null | undefined,
  displayName: string
): string {
  const trimmed = aiDescription?.trim();
  if (!trimmed) {
    return `Scholarships and profile for ${displayName} on ScholarshipTop.`;
  }

  const singleLine = trimmed.replace(/\s+/g, ' ').trim();
  return singleLine.length <= 160
    ? singleLine
    : `${singleLine.slice(0, 157).trimEnd()}...`;
}

function formatProviderProfileDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatProviderAwardPool(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function normalizeAiSourceHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return url;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Up to two paragraphs for profile copy (avoid a full scroll of text). */
function aboutProviderParagraphs(text: string | null | undefined): string[] {
  const t = text?.trim();
  if (!t) return [];
  return t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 2);
}

/** Deduped http(s) URLs for the sources list. */
function providerProfileSourceLinks(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== 'string') continue;
    const u = normalizeAiSourceHref(raw).trim();
    if (!u) continue;
    let key: string;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      key = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function sourceHostFromHref(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, '') || '';
  } catch {
    return '';
  }
}

function providerHostLabel(href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function mergeProviderFaqItems(
  primary: ProviderFaqItem[],
  fallback: ProviderFaqItem[]
): ProviderFaqItem[] {
  const seen = new Set<string>();
  const out: ProviderFaqItem[] = [];
  for (const item of [...primary, ...fallback]) {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildProviderTrustFaq(providerName: string): ProviderFaqItem[] {
  return [
    {
      question: `How does ScholarshipTop help with ${providerName} scholarships?`,
      answer:
        `ScholarshipTop organizes connected listings, eligibility signals, deadlines, award details, source-quality context, and provider application paths when available so students can compare opportunities tied to ${providerName} in one workspace.`
    },
    {
      question: 'What details can I use to plan my application?',
      answer:
        'Use the provider profile to review eligibility patterns, deadline context, required documents, award details, renewal notes, and the available application route before adding opportunities to your shortlist.'
    },
    {
      question: 'Why might a provider profile have incomplete data?',
      answer:
        'Provider profiles are based on available ScholarshipTop listing data. Some listings do not expose a clear provider URL, current deadline, or full eligibility details, so ScholarshipTop flags the available source-quality context instead of inventing it.'
    }
  ];
}

type PageProps = {
  params: { id: string };
  searchParams?: ProvidersHubSearchParams;
};

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  const stateCode = getProvidersHubStateCodeFromPathSegment(params.id);
  if (stateCode) {
    const stateName = US_STATE_CODE_TO_NAME[stateCode];
    const seg = SEO_ROUTE_STATE_CODE_TO_SLUG[stateCode];
    const path = `/providers/${seg}`;
    const canonicalUrl = getCanonical(path);
    const title = `Scholarship providers in ${stateName} | ScholarshipTop`;
    const description = `Browse organizations and foundations offering scholarships with ties to ${stateName}.`;
    const indexFromQuery = providersHubStatePathIsSeoIndexable(
      searchParams
    );
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      ...(indexFromQuery
        ? {}
        : { robots: { index: false, follow: true } }),
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'website'
      }
    };
  }

  const slug = await resolveProviderProfileSlug(params.id);
  const data = slug ? await getCachedProviderProfilePage(slug, 1) : null;
  if (!data) {
    return { title: 'Provider' };
  }
  const profilePath = `/providers/${encodeURIComponent(data.slug)}`;
  const canonicalUrl = getCanonical(profilePath);
  const listingPage = parseProviderProfilePageParam(searchParams?.page);
  const isPaginatedListing = listingPage > 1;
  const pageTitleMeta = `${data.displayName} | Scholarship Provider`;
  const description = providerMetaDescription(
    data.aiDescription,
    data.displayName
  );
  const quality = getProviderSeoQualityPolicy({
    slug: data.slug,
    displayName: data.displayName,
    activeScholarshipCount: data.totalScholarshipCount,
    officialUrl: data.officialUrl,
    hasDescription: Boolean(data.aiDescription?.trim()),
    hasPublicScholarshipList: data.totalScholarshipCount > 0,
    hasSourceTrustContext: true,
    routeResolves: true
  });
  return {
    title: pageTitleMeta,
    description,
    alternates: { canonical: canonicalUrl },
    ...(isPaginatedListing || !quality.indexable
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title: pageTitleMeta,
      description,
      url: canonicalUrl,
      type: 'website'
    }
  };
}

export default async function ProviderProfilePage({
  params,
  searchParams
}: PageProps) {
  const stateCode = getProvidersHubStateCodeFromPathSegment(params.id);
  if (stateCode) {
    const canonicalSlug = SEO_ROUTE_STATE_CODE_TO_SLUG[stateCode];
    const seg = decodeURIComponent(params.id).trim().toLowerCase();
    const hubSearchParams: ProvidersHubSearchParams = searchParams ?? {};
    const { q, countryBucket, currentPage } = parseProvidersHubListingInputs(
      hubSearchParams,
      stateCode
    );
    if (canonicalSlug !== seg) {
      permanentRedirect(
        buildProvidersHubHref({
          q: q ?? undefined,
          state: stateCode,
          country: countryBucket,
          page: currentPage > 1 ? currentPage : undefined
        })
      );
    }
    return (
      <ProvidersHubPageContent
        searchParams={hubSearchParams}
        pathStateCode={stateCode}
        stateSlug={canonicalSlug}
      />
    );
  }

  const currentPage = parseProviderProfilePageParam(searchParams?.page);
  const slug = await resolveProviderProfileSlug(params.id);
  if (!slug) notFound();
  if (slug !== decodeURIComponent(params.id).trim()) {
    permanentRedirect(buildProviderProfileScholarshipsHref(slug, currentPage));
  }

  const data = await getCachedProviderProfilePage(slug, currentPage);
  if (!data) notFound();

  const totalPages =
    data.totalScholarshipCount === 0
      ? 1
      : Math.ceil(
          data.totalScholarshipCount / PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
        );

  if (data.totalScholarshipCount > 0 && currentPage > totalPages) {
    redirect(buildProviderProfileScholarshipsHref(slug, totalPages));
  }

  const showingFrom =
    data.totalScholarshipCount === 0
      ? 0
      : (currentPage - 1) * PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE + 1;
  const showingTo =
    data.totalScholarshipCount === 0
      ? 0
      : Math.min(
          currentPage * PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE,
          data.totalScholarshipCount
        );

  const aboutParas = aboutProviderParagraphs(data.aiDescription);
  const sourceLinks = providerProfileSourceLinks(data.aiSources);

  const officialHrefNormalized = data.officialUrl?.trim()
    ? normalizeAiSourceHref(data.officialUrl)
    : null;
  const providerQuality = getProviderSeoQualityPolicy({
    slug: data.slug,
    displayName: data.displayName,
    activeScholarshipCount: data.totalScholarshipCount,
    officialUrl: officialHrefNormalized,
    hasDescription: aboutParas.length > 0,
    hasPublicScholarshipList: data.totalScholarshipCount > 0,
    hasSourceTrustContext: true,
    routeResolves: true
  });

  /** English-only route today; pass es/fr when /[locale]/providers/[slug] ships. */
  const uiLocale: LocalizedUiLocale = 'en';
  const detailUi = getProviderDetailUiCopy(uiLocale);

  const providerPath = `/providers/${encodeURIComponent(data.slug)}`;
  const providerUrl = getURL(providerPath);
  const resolvedDescription = providerMetaDescription(
    data.aiDescription,
    data.displayName
  );
  const pageTitleMeta = `${data.displayName} | Scholarship Provider`;
  const providerSchema =
    providerQuality.sourceStatus === 'official_source_available'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: data.displayName,
          url: officialHrefNormalized || providerUrl,
          mainEntityOfPage: providerUrl,
          description: resolvedDescription,
          ...(officialHrefNormalized ? { sameAs: [officialHrefNormalized] } : {})
        }
      : null;

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: detailUi.nav.home,
        item: getURL('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: detailUi.nav.providersHub,
        item: getURL('/providers')
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.displayName,
        item: providerUrl
      }
    ]
  };

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitleMeta,
    url: providerUrl,
    description: resolvedDescription,
    ...(data.lastUpdatedAt ? { dateModified: data.lastUpdatedAt } : {})
  };

  const tocItems: Array<{ id: string; label: string }> = [];

  tocItems.push(
    { id: 'provider-about', label: detailUi.toc.aboutProvider },
    { id: 'provider-source-status', label: detailUi.toc.sourceStatus },
    { id: 'provider-explore-scholarships', label: detailUi.toc.exploreScholarships }
  );
  if (officialHrefNormalized || sourceLinks.length > 0) {
    tocItems.push({
      id: 'provider-official-sources',
      label: officialHrefNormalized
        ? detailUi.toc.officialWebsite
        : detailUi.toc.sources
    });
  }
  const providerTrustFaq = buildProviderTrustFaq(data.displayName);
  const faqItems = mergeProviderFaqItems(data.aiFaq, providerTrustFaq);

  if (faqItems.length > 0) {
    tocItems.push({ id: 'provider-faq-heading', label: detailUi.toc.faq });
  }
  tocItems.push({
    id: 'provider-scholarships',
    label: detailUi.toc.scholarshipsFromProvider
  });
  if (data.similarProviders.length > 0) {
    tocItems.push({
      id: 'provider-similar-organizations',
      label: detailUi.toc.similarOrganizations
    });
  }

  const faqLd =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer
            }
          }))
        }
      : null;
  const formattedAwardPool = formatProviderAwardPool(data.totalAwardAmount);
  const formattedLastUpdated = formatProviderProfileDate(data.lastUpdatedAt);
  const profileLocationLine = formatProviderHqLocationLine(data.hqState);
  const showAwardPool =
    data.totalScholarshipCount > 3 && formattedAwardPool != null;

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16 pt-8 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      {providerSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(providerSchema) }}
        />
      ) : null}
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 max-sm:w-full max-sm:text-center sm:text-4xl">
                {data.displayName}
              </h1>
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 sm:self-center">
                <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} aria-hidden />
                {getLocalizedProviderSourceStatusLabel(
                  providerQuality.sourceStatus,
                  uiLocale
                )}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  {detailUi.stats.activeScholarships}
                </p>
                <p className="mt-1 tabular-nums text-xl font-bold text-gray-900">
                  {data.totalScholarshipCount.toLocaleString()}
                </p>
              </div>
              {showAwardPool ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                    {detailUi.stats.totalAwardPool}
                  </p>
                  <p className="mt-1 tabular-nums text-xl font-bold text-emerald-950">
                    {formattedAwardPool}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    {detailUi.stats.knownAmountsFor(
                      data.knownAwardAmountCount.toLocaleString()
                    )}
                  </p>
                </div>
              ) : null}
              {formattedLastUpdated ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    {detailUi.stats.lastUpdated}
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formattedLastUpdated}
                  </p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  {detailUi.stats.dataCompleteness}
                </p>
                <p className="mt-1 text-xl font-bold leading-snug text-gray-900">
                  {getLocalizedProviderDataCompletenessLabel(
                    providerQuality.dataCompleteness,
                    uiLocale
                  )}
                </p>
              </div>
              {profileLocationLine ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    {detailUi.stats.location}
                  </p>
                  <p className="mt-1 text-xl font-bold leading-snug text-gray-900">
                    {profileLocationLine}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <ProviderProfileTableOfContents
          items={tocItems}
          onThisPageLabel={detailUi.tocOnThisPage}
        />

        <section
          id="provider-about"
          className="scroll-mt-24 mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-lg font-bold text-gray-900">{detailUi.about.heading}</h2>
          {aboutParas.length > 0 ? (
            <div className="mt-4 max-w-3xl space-y-4 text-sm leading-relaxed text-gray-700 sm:text-[0.9375rem]">
              {aboutParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">{detailUi.about.emptyBody}</p>
          )}
        </section>

        <ProviderSourceStatusBlock
          providerName={data.displayName}
          sourceStatus={providerQuality.sourceStatus}
          dataCompleteness={providerQuality.dataCompleteness}
          officialHref={officialHrefNormalized}
          reasons={providerQuality.reasons}
          uiLocale={uiLocale}
          detailUi={detailUi}
        />

        <ProviderProfileIqCta providerName={data.displayName} iqCta={detailUi.iqCta} />

        <ProviderProfileContextLinks
          copy={detailUi.contextLinks}
          items={getProviderContextLinkItems(uiLocale)}
        />

        {officialHrefNormalized || sourceLinks.length > 0 ? (
          <section
            id="provider-official-sources"
            className="scroll-mt-24 mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-lg font-bold text-gray-900">
              {officialHrefNormalized
                ? detailUi.toc.officialWebsite
                : detailUi.toc.sources}
            </h2>
            {officialHrefNormalized ? (
              <div className="mt-4">
                <ProviderOfficialWebsiteGate
                  href={officialHrefNormalized}
                  label={detailUi.official.openOfficialWebsite}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
                />
              </div>
            ) : null}
            {sourceLinks.length > 0 ? (
              <div
                className={officialHrefNormalized ? 'mt-8' : 'mt-4'}
              >
                {officialHrefNormalized ? (
                  <h3 className="text-lg font-bold text-gray-900">{detailUi.toc.sources}</h3>
                ) : null}
                <ul
                  className={
                    officialHrefNormalized
                      ? 'mt-4 list-none space-y-2.5 text-sm'
                      : 'mt-4 list-none space-y-2.5 text-sm'
                  }
                >
                  {sourceLinks.map((href, index) => (
                    <li
                      key={href}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-words font-semibold text-emerald-900 transition hover:text-emerald-950"
                      >
                        {detailUi.sourceLinkLabel(index, sourceHostFromHref(href))}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <ProviderProfileFaqAccordion items={faqItems} heading={detailUi.toc.faq} />

        <section
          id="provider-scholarships"
          className="mt-12 scroll-mt-24 md:scroll-mt-28"
        >
          <ProviderProfileScholarshipsScroll page={currentPage} />
          <div className="mb-6 flex flex-col gap-4">
            <ProviderScholarshipMatchCta locale={uiLocale} />
          </div>

          {data.similarProviders.length > 0 ? (
            <section
              id="provider-similar-organizations"
              aria-labelledby="provider-similar-orgs-heading"
              className="scroll-mt-24 mt-8 mb-8"
            >
              <h2
                id="provider-similar-orgs-heading"
                className="mb-3 text-xl font-bold text-gray-900 sm:mb-6"
              >
                {detailUi.similar.exploreHeading}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.similarProviders.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/providers/${encodeURIComponent(p.slug)}`}
                    className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-emerald-200/80 hover:shadow-md"
                  >
                    <div className="h-1 w-10 rounded-full bg-emerald-500/90 transition group-hover:w-14" />
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-gray-900">
                      {p.displayName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {detailUi.similar.scholarshipsCount(
                        p.scholarshipCount.toLocaleString()
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {data.totalScholarshipCount === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <p className="text-base font-medium text-zinc-900">
                {detailUi.scholarships.noScholarships}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                {detailUi.scholarshipsEmpty.onboardingHint}
              </p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55"
              >
                {detailUi.scholarshipsEmpty.getNotified}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                {detailUi.showingScholarships(
                  showingFrom,
                  showingTo,
                  data.totalScholarshipCount.toLocaleString()
                )}
              </p>
              <div className="mt-6 flex w-full min-w-0 flex-col gap-4">
                <ProviderProfilePageAuthBridge scholarships={data.scholarships} />
              </div>
              <ResourcesPagination
                locale={uiLocale}
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={(p) => buildProviderProfileScholarshipsHref(slug, p)}
                linkScroll={false}
                navClassName="mt-4 flex flex-col items-center gap-2 sm:mt-12 sm:gap-3"
              />
            </>
          )}
        </section>

      </div>
    </div>
  );
}

function ProviderSourceStatusBlock({
  providerName,
  sourceStatus,
  dataCompleteness,
  officialHref,
  reasons,
  uiLocale,
  detailUi
}: {
  providerName: string;
  sourceStatus: ProviderSourceStatus;
  dataCompleteness: ProviderDataCompleteness;
  officialHref: string | null;
  reasons: string[];
  uiLocale: LocalizedUiLocale;
  detailUi: ReturnType<typeof getProviderDetailUiCopy>;
}) {
  const host = providerHostLabel(officialHref);

  return (
    <section
      id="provider-source-status"
      className="scroll-mt-24 mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="provider-source-status-heading"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            {detailUi.sourceStatus.sectionEyebrow}
          </p>
          <h2
            id="provider-source-status-heading"
            className="mt-2 text-xl font-bold tracking-tight text-gray-900"
          >
            {detailUi.sourceStatus.heading(providerName)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
            {detailUi.sourceStatus.intro}
          </p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
              {detailUi.sourceStatus.sourceLabel}
            </p>
            <p className="mt-1 text-sm font-bold text-gray-950">
              {getLocalizedProviderSourceStatusLabel(sourceStatus, uiLocale)}
            </p>
            {host ? (
              <p className="mt-1 break-words text-xs text-gray-500">{host}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
              {detailUi.sourceStatus.completenessLabel}
            </p>
            <p className="mt-1 text-sm font-bold text-gray-950">
              {getLocalizedProviderDataCompletenessLabel(dataCompleteness, uiLocale)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
          <h3 className="text-sm font-bold text-gray-950">
            {detailUi.trust.verifyBeforeApply}
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
            {detailUi.trust.verifyItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
          <h3 className="text-sm font-bold text-gray-950">Quality notes</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
            {reasons.slice(0, 4).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/scholarship-verification-methodology"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          {detailUi.trust.verificationMethodology}
        </Link>
        <Link
          href="/corrections"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          {detailUi.trust.reportCorrection}
        </Link>
        <Link
          href="/financial-aid-disclaimer"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          Financial aid disclaimer
        </Link>
      </div>
    </section>
  );
}

function ProviderProfileIqCta({
  providerName,
  iqCta
}: {
  providerName: string;
  iqCta: ReturnType<typeof getProviderDetailUiCopy>['iqCta'];
}) {
  return (
    <Link
      href="/iq/assessment?intent=provider_research"
      className="group relative mt-6 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:p-6"
      aria-labelledby="provider-profile-iq-cta-heading"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#FF7A1A]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-16 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl"
        aria-hidden
      />

      <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FFB875] bg-white/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3.5 w-3.5 text-[#F97316]" aria-hidden />
              {iqCta.featuredTool}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              {iqCta.providerFit}
            </span>
          </div>
          <h2
            id="provider-profile-iq-cta-heading"
            className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            {iqCta.prioritizeTitle(providerName)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {iqCta.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {iqCta.chips.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur sm:w-48">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {iqCta.previewReport}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">IQ</p>
              <p className="mt-1 text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">Type</p>
              <p className="mt-1 text-sm font-bold leading-none text-slate-950">
                ???
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            {iqCta.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
