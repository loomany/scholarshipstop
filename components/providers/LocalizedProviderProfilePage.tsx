import Link from 'next/link';
import { ArrowRight, BrainCircuit, Check } from 'lucide-react';

import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import ProviderProfilePageAuthBridge from '@/app/providers/ProviderProfilePageAuthBridge';
import { ProviderProfileContextLinks } from '@/components/providers/ProviderProfileContextLinks';
import { ProviderProfileTableOfContents } from '@/components/providers/ProviderProfileTableOfContents';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import { ProviderOfficialWebsiteGate } from '@/components/providers/ProviderOfficialWebsiteGate';
import { ProviderProfileScholarshipsScroll } from '@/components/providers/ProviderProfileScholarshipsScroll';
import { formatProviderHqLocationLine } from '@/lib/providers/providerHubRegionLabel';
import type { ProviderProfilePayload } from '@/lib/providers/providerProfileTypes';
import {
  buildLocalizedProviderProfileScholarshipsHref,
  PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
} from '@/lib/providers/providerProfilePagination';
import {
  getProviderSeoQualityPolicy,
  type ProviderDataCompleteness,
  type ProviderSourceStatus
} from '@/lib/seo/providerSeoQualityPolicy';
import {
  getProviderContextLinkItems,
  getProviderDetailUiCopy
} from '@/lib/i18n/providerDetailUiCopy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';
import ProviderScholarshipMatchCta from '@/components/providers/ProviderScholarshipMatchCta';
import type { LocalizedProviderPageCopy } from '@/lib/i18n/providerPilot/providerProfileTranslationGate';
import {
  getLocalizedProviderDataCompletenessLabel,
  getLocalizedProviderSourceStatusLabel
} from '@/lib/i18n/providerDisplayLabels';
import {
  hrefForLocalizedUiRequired,
  localizedProviderProfileHref
} from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { getURL } from '@/utils/helpers';

function normalizeAiSourceHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return url;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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

function formatProviderProfileDate(
  iso: string | null | undefined,
  locale: Stage2PilotLocale
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const tag = locale === 'es' ? 'es-US' : 'fr-FR';
  return new Intl.DateTimeFormat(tag, {
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

function providerHostLabel(href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

export type LocalizedProviderProfilePageProps = {
  locale: Stage2PilotLocale;
  slug: string;
  data: ProviderProfilePayload;
  copy: LocalizedProviderPageCopy;
  currentPage: number;
};

export default function LocalizedProviderProfilePage({
  locale,
  slug,
  data,
  copy,
  currentPage
}: LocalizedProviderProfilePageProps) {
  const detailUi = getProviderDetailUiCopy(locale);
  const aboutParas = copy.aboutParagraphs;
  const faqItems = copy.faqItems;
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

  const providerPath = localizedProviderProfileHref(locale, data.slug);
  const providerUrl = getURL(providerPath);

  const totalPages =
    data.totalScholarshipCount === 0
      ? 1
      : Math.ceil(
          data.totalScholarshipCount / PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
        );

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

  const formattedAwardPool = formatProviderAwardPool(data.totalAwardAmount);
  const formattedLastUpdated = formatProviderProfileDate(data.lastUpdatedAt, locale);
  const profileLocationLine = formatProviderHqLocationLine(data.hqState);
  const showAwardPool =
    data.totalScholarshipCount > 3 && formattedAwardPool != null;

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: detailUi.nav.home,
        item: getURL(hrefForLocalizedUiRequired(locale, '/'))
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: detailUi.nav.providersHub,
        item: getURL(hrefForLocalizedUiRequired(locale, '/providers'))
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.displayName,
        item: providerUrl
      }
    ]
  };

  const tocItems: Array<{ id: string; label: string }> = [
    { id: 'provider-about', label: detailUi.toc.aboutProvider },
    { id: 'provider-source-status', label: detailUi.toc.sourceStatus },
    { id: 'provider-explore-scholarships', label: detailUi.toc.exploreScholarships }
  ];
  if (officialHrefNormalized || sourceLinks.length > 0) {
    tocItems.push({
      id: 'provider-official-sources',
      label: officialHrefNormalized
        ? detailUi.toc.officialWebsite
        : detailUi.toc.sources
    });
  }
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

  const resolvedDescription =
    copy.metaDescription.trim() ||
    detailUi.metaDescriptionFallback(data.displayName);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.metaTitle,
    url: providerUrl,
    description: resolvedDescription,
    ...(data.lastUpdatedAt ? { dateModified: data.lastUpdatedAt } : {})
  };

  const faqLd =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer }
          }))
        }
      : null;

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
                  locale
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
                    locale
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

        <LocalizedProviderSourceStatusBlock
          providerName={data.displayName}
          sourceStatus={providerQuality.sourceStatus}
          dataCompleteness={providerQuality.dataCompleteness}
          officialHref={officialHrefNormalized}
          locale={locale}
          detailUi={detailUi}
        />

        <LocalizedProviderProfileIqCta
          providerName={data.displayName}
          iqCta={detailUi.iqCta}
        />

        <ProviderProfileContextLinks
          copy={detailUi.contextLinks}
          items={getProviderContextLinkItems(locale)}
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
              <div className={officialHrefNormalized ? 'mt-8' : 'mt-4'}>
                {officialHrefNormalized ? (
                  <h3 className="text-lg font-bold text-gray-900">
                    {detailUi.toc.sources}
                  </h3>
                ) : null}
                <ul className="mt-4 list-none space-y-2.5 text-sm">
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
            <ProviderScholarshipMatchCta locale={locale} />
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
                    href={localizedProviderProfileHref(locale, p.slug)}
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
                href={hrefForLocalizedUiRequired(locale, '/onboarding')}
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
                locale={locale}
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={(p) =>
                  buildLocalizedProviderProfileScholarshipsHref(locale, slug, p)
                }
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

function LocalizedProviderSourceStatusBlock({
  providerName,
  sourceStatus,
  dataCompleteness,
  officialHref,
  locale,
  detailUi
}: {
  providerName: string;
  sourceStatus: ProviderSourceStatus;
  dataCompleteness: ProviderDataCompleteness;
  officialHref: string | null;
  locale: Stage2PilotLocale;
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
              {getLocalizedProviderSourceStatusLabel(sourceStatus, locale)}
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
              {getLocalizedProviderDataCompletenessLabel(dataCompleteness, locale)}
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
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={hrefForLocalizedUiRequired(
            locale,
            '/scholarship-verification-methodology'
          )}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          {detailUi.trust.verificationMethodology}
        </Link>
        <Link
          href={hrefForLocalizedUiRequired(locale, '/corrections')}
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-white"
        >
          {detailUi.trust.reportCorrection}
        </Link>
      </div>
    </section>
  );
}

function LocalizedProviderProfileIqCta({
  providerName,
  iqCta
}: {
  providerName: string;
  iqCta: ReturnType<typeof getProviderDetailUiCopy>['iqCta'];
}) {
  if (!isIqSitePromoVisible()) return null;

  return (
    <Link
      href="/iq/assessment?intent=provider_research"
      className="group relative mt-6 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:p-6"
      aria-labelledby="provider-profile-iq-cta-heading"
    >
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
          <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-center text-sm font-bold text-white sm:w-auto">
            {iqCta.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
