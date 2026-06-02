import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import { CompareExternalStateAffordabilitySection } from '@/components/compare/CompareExternalStateAffordabilitySection';
import CompareExploreRelatedScholarships from '@/components/compare/CompareExploreRelatedScholarships';
import ScholarshipMatchCtaIcon from '@/components/compare/ScholarshipMatchCtaIcon';
import TopScholarshipProvidersColumn from '@/components/compare/TopScholarshipProvidersColumn';
import CompareTableOfContents from '@/components/compare/CompareTableOfContents';
import CompareThinVerdictExplanation from '@/components/compare/CompareThinVerdictExplanation';
import {
  formatCompareNumericText,
  SafeCompareHtml
} from '@/components/compare/SafeCompareHtml';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { fetchCompareRelatedContent } from '@/lib/seo/compareRelatedContent';
import { parseCompareSources } from '@/lib/seo/compareSources';
import { resolveAiMetaDescription } from '@/lib/seo/aiMetaDescriptionService';
import {
  fetchPublishedStateComparePageBySlug,
  fetchStateComparisonDataRpc,
  stateComparisonGrantCountsOk,
  stateContentJsonAsRecord
} from '@/lib/seo/stateCompareServer';
import { injectH2H3IdsAndExtractToc } from '@/lib/content-hub/resourceArticleBodyToc';
import { buildStateCompareTocMerged } from '@/lib/seo/comparePageToc';
import {
  buildStateThinVerdictParagraphs,
  countWordsInCompareSources,
  isCompareArticleThin
} from '@/lib/seo/compareThinVerdictNarrative';
import { getURL } from '@/utils/helpers';
import { getCompareDetailUiCopy } from '@/lib/i18n/compareDetailUiCopy';
import {
  getCompareStateDetailUiCopy,
  type CompareStateDetailUiCopy
} from '@/lib/i18n/compareStateDetailUiCopy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';
import {
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

const COMPARE_YEAR = 2026;

function numberLocale(locale: LocalizedUiLocale): string {
  if (locale === 'es') return 'es-ES';
  if (locale === 'fr') return 'fr-FR';
  return 'en-US';
}

function fmtUsd(n: unknown, locale: LocalizedUiLocale, noData: string): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return noData;
  return new Intl.NumberFormat(numberLocale(locale), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
}

function fmtNum(
  n: unknown,
  locale: LocalizedUiLocale,
  noData: string,
  digits = 0
): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return noData;
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(n);
}

function StateCompareIqCta({
  stateA,
  stateB,
  copy
}: {
  stateA: string;
  stateB: string;
  copy: CompareStateDetailUiCopy['iqCta'];
}) {
  if (!isIqSitePromoVisible()) return null;

  return (
    <Link
      href="/iq/assessment?intent=college_fit"
      className="group relative mt-6 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:mt-8 sm:p-6"
      aria-labelledby="state-compare-iq-cta-heading"
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
              <BrainCircuit
                className="h-3.5 w-3.5 text-[#F97316]"
                aria-hidden
              />
              {copy.featuredTool}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              {copy.badge}
            </span>
          </div>
          <h2
            id="state-compare-iq-cta-heading"
            className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {copy.body(stateA, stateB)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {copy.chips.map((item) => (
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
            {copy.previewReport}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">
                {copy.iqLabel}
              </p>
              <p className="mt-1 text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">
                {copy.typeLabel}
              </p>
              <p className="mt-1 text-sm font-bold leading-none text-slate-950">
                {copy.profileLabel}
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            {copy.startTest}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export type StateCompareDetailPageBodyProps = {
  slug: string;
  locale?: LocalizedUiLocale;
};

export async function StateCompareDetailPageBody({
  slug: rawSlug,
  locale = 'en'
}: StateCompareDetailPageBodyProps) {
  const slug = rawSlug.trim().toLowerCase();
  const detailUi = getCompareDetailUiCopy(locale);
  const stateUi = getCompareStateDetailUiCopy(locale);
  const homeHref = hrefForLocalizedUiRequired(locale, '/');
  const compareHref = hrefForLocalizedUiRequired(locale, '/compare');
  const stateHubHref = hrefForLocalizedUiRequired(locale, '/compare/states');
  const loaded = await fetchPublishedStateComparePageBySlug(slug);
  if (!loaded) notFound();

  const { page, stateA, stateB } = loaded;
  const data = await fetchStateComparisonDataRpc(stateA.code, stateB.code);
  if (!stateComparisonGrantCountsOk(data)) notFound();

  const a = data?.['state_a'] as Record<string, unknown> | undefined;
  const b = data?.['state_b'] as Record<string, unknown> | undefined;
  const canonicalPath = `/compare/states/${encodeURIComponent(slug)}`;

  const content = stateContentJsonAsRecord(page.content_json);
  const bodyHtmlRaw =
    typeof content['body_html'] === 'string' ? content['body_html'] : '';
  const { html: bodyHtmlAnchored, toc: bodyTocItems } =
    injectH2H3IdsAndExtractToc(bodyHtmlRaw.trim(), {
      idSlugPrefix: 'compare-body'
    });
  const climate = content['climate_summary'] as
    | { state_a?: string; state_b?: string }
    | undefined;
  const faqRaw = content['faq'];
  const faqItems =
    Array.isArray(faqRaw) &&
    faqRaw.every(
      (x) =>
        x &&
        typeof x === 'object' &&
        typeof (x as { q?: string }).q === 'string' &&
        typeof (x as { a?: string }).a === 'string'
    )
      ? (faqRaw as { q: string; a: string }[])
      : [];
  const sources = parseCompareSources(content['sources']);

  const topA = Array.isArray(a?.['top_universities'])
    ? (a?.['top_universities'] as Array<Record<string, unknown>>)
    : [];
  const topB = Array.isArray(b?.['top_universities'])
    ? (b?.['top_universities'] as Array<Record<string, unknown>>)
    : [];
  const topStateAHref = stateA.slug?.trim()
    ? hrefForLocalizedUiRequired(
        locale,
        `/scholarships/${encodeURIComponent(stateA.slug.trim())}`
      )
    : null;
  const topStateBHref = stateB.slug?.trim()
    ? hrefForLocalizedUiRequired(
        locale,
        `/scholarships/${encodeURIComponent(stateB.slug.trim())}`
      )
    : null;
  const documentTitle =
    page.meta_title?.trim() ||
    `${stateA.name} vs ${stateB.name}: Scholarship Climate ${COMPARE_YEAR}`;
  const fallbackDescriptionMeta =
    page.meta_description?.trim() ||
    `Compare scholarship climate, grant volume, and top universities in ${stateA.name} and ${stateB.name}.`;
  const relatedContentPromise = fetchCompareRelatedContent({
    instAName: stateA.name,
    instBName: stateB.name,
    stateA: stateA.name,
    stateB: stateB.name,
    pageTitle: documentTitle,
    aiVerdict: page.ai_verdict,
    bodyHtml: bodyHtmlAnchored,
    essayTextA: climate?.state_a,
    essayTextB: climate?.state_b,
    limit: 3
  });
  const resolvedMetaDescriptionPromise = resolveAiMetaDescription({
    canonicalPath,
    routeKind: 'compare_state',
    title: documentTitle,
    fallbackDescription: fallbackDescriptionMeta,
    context: {
      slug,
      stateA: stateA.name,
      stateB: stateB.name
    },
    priority: 6
  });
  const [relatedContent, resolvedMetaDescriptionMaybe] = await Promise.all([
    relatedContentPromise,
    resolvedMetaDescriptionPromise
  ]);
  const resolvedMetaDescription =
    resolvedMetaDescriptionMaybe ?? fallbackDescriptionMeta;

  const compareTocItems = buildStateCompareTocMerged({
    locale,
    bodyToc: bodyTocItems,
    hasClimateEssay: Boolean(
      climate?.state_a?.trim() || climate?.state_b?.trim()
    ),
    faqCount: faqItems.length,
    sourcesCount: sources.length,
    hasRelated:
      relatedContent.resources.length > 0 || relatedContent.essays.length > 0
  });

  const comparePageAbsoluteUrl = getURL(canonicalPath.replace(/^\/+/, ''));

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: stateUi.home,
        item: getURL(homeHref.replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: stateUi.compare,
        item: getURL(compareHref.replace(/^\/+/, ''))
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: stateUi.stateHub,
        item: getURL(stateHubHref.replace(/^\/+/, ''))
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `${stateA.name} vs ${stateB.name}`,
        item: comparePageAbsoluteUrl
      }
    ]
  };

  const grantCountA =
    typeof a?.['grant_count'] === 'number' &&
    !Number.isNaN(a['grant_count'] as number)
      ? (a['grant_count'] as number)
      : null;
  const grantCountB =
    typeof b?.['grant_count'] === 'number' &&
    !Number.isNaN(b['grant_count'] as number)
      ? (b['grant_count'] as number)
      : null;

  const compareWordTotal = countWordsInCompareSources(
    bodyHtmlRaw,
    page.ai_verdict,
    climate?.state_a,
    climate?.state_b
  );
  const showThinVerdict = isCompareArticleThin(compareWordTotal);

  const faqJsonLd =
    faqItems.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a
            }
          }))
        }
      : null;

  return (
    <div className="bg-white text-gray-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: documentTitle,
            url: comparePageAbsoluteUrl,
            description: resolvedMetaDescription
          })
        }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <p>
          <Link
            href={stateHubHref}
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            {stateUi.backToHub}
          </Link>
        </p>

        <nav
          className="mt-4 text-sm text-gray-500"
          aria-label={stateUi.breadcrumbAria}
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href={homeHref}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {stateUi.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={compareHref}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {stateUi.compare}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={stateHubHref}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {stateUi.stateHub}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="max-w-[min(100%,16rem)] truncate font-medium text-gray-900 sm:max-w-md">
              {stateA.name} vs {stateB.name}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {stateUi.pageTitle(stateA.name, stateB.name, COMPARE_YEAR)}
          </h1>
          {page.ai_verdict?.trim() ? (
            <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
              <span className="font-semibold text-gray-900">
                {stateUi.verdictLead}
              </span>
              {formatCompareNumericText(page.ai_verdict.trim())}
            </p>
          ) : null}
        </header>

        <CompareTableOfContents
          items={compareTocItems}
          labelId="compare-state-toc-label"
          onThisPageLabel={stateUi.tocOnThisPage}
        />

        <section className="mt-8 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            {stateUi.badgeStateVsState}
          </span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">
                {stateUi.institutionA}
              </p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">
                {stateA.name}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">
                {stateUi.institutionB}
              </p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">
                {stateB.name}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2
            id="compare-state-quick-heading"
            className="scroll-mt-28 text-center text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
          >
            {stateUi.quickComparison}
          </h2>
          <div className="mt-5">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[32%]" />
                <col className="w-[32%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90">
                  <th className="px-3 py-3 font-semibold text-gray-800 sm:px-4">
                    {stateUi.tableMetric}
                  </th>
                  <th className="px-3 py-3 font-semibold text-gray-900 sm:px-4">
                    <span className="block text-balance">{stateA.name}</span>
                  </th>
                  <th className="px-3 py-3 font-semibold text-gray-900 sm:px-4">
                    <span className="block text-balance">{stateB.name}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    {stateUi.tableActiveScholarships}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(a?.['grant_count'], locale, stateUi.noData, 0)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(b?.['grant_count'], locale, stateUi.noData, 0)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    {stateUi.tableAvgAward}
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {fmtUsd(a?.['avg_amount'], locale, stateUi.noData)}
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {fmtUsd(b?.['avg_amount'], locale, stateUi.noData)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    {stateUi.tableMaxAward}
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {fmtUsd(a?.['max_amount'], locale, stateUi.noData)}
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {fmtUsd(b?.['max_amount'], locale, stateUi.noData)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <StateCompareIqCta
            stateA={stateA.name}
            stateB={stateB.name}
            copy={stateUi.iqCta}
          />
          {bodyHtmlAnchored.trim() ? (
            <div className="mt-8 border-t border-gray-100 pt-8 [&_h2[id]]:scroll-mt-28 [&_h2[id]]:sm:scroll-mt-24 [&_h3[id]]:scroll-mt-28 [&_h3[id]]:sm:scroll-mt-24 sm:pt-10">
              <SafeCompareHtml html={bodyHtmlAnchored} />
            </div>
          ) : null}
        </section>

        {showThinVerdict ? (
          <CompareThinVerdictExplanation
            heading={stateUi.thinVerdictHeading}
            paragraphs={buildStateThinVerdictParagraphs({
              year: COMPARE_YEAR,
              stateAName: stateA.name,
              stateBName: stateB.name,
              grantCountA,
              grantCountB
            })}
          />
        ) : null}

        <section
          id="compare-state-top-providers-heading"
          className="scroll-mt-28 mt-10 grid gap-6 sm:scroll-mt-24 md:grid-cols-2"
          aria-label={detailUi.topProviders.sectionAriaLabel}
        >
          <TopScholarshipProvidersColumn
            locale={locale}
            stateName={stateA.name}
            stateSlug={stateA.slug}
            items={topA}
            browseHref={topStateAHref}
          />
          <TopScholarshipProvidersColumn
            locale={locale}
            stateName={stateB.name}
            stateSlug={stateB.slug}
            items={topB}
            browseHref={topStateBHref}
          />
        </section>

        <section
          className="mt-10 rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5"
          aria-label={detailUi.scholarshipMatchCta.sectionAriaLabel}
        >
          <div className="flex justify-center px-1">
            <div className="inline-flex max-w-full items-center gap-2">
              <ScholarshipMatchCtaIcon />
              <h2
                id="compare-state-cta-heading"
                className="scroll-mt-28 whitespace-normal text-left text-base font-bold leading-tight tracking-tight text-indigo-950 sm:scroll-mt-24 sm:whitespace-nowrap sm:text-lg md:text-[1.5rem]"
              >
                {detailUi.scholarshipMatchCta.heading}
              </h2>
            </div>
          </div>
          <HomePrimaryCtaClient
            locale={locale}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
          >
            {detailUi.scholarshipMatchCta.button}
          </HomePrimaryCtaClient>
        </section>

        {climate?.state_a || climate?.state_b ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-climate-heading"
          >
            <h2
              id="state-climate-heading"
              className="scroll-mt-28 text-center text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
            >
              {stateUi.climateHeading}
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-gray-900">
                  {stateA.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-900">
                  {climate?.state_a?.trim()
                    ? formatCompareNumericText(climate.state_a.trim())
                    : stateUi.noData}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-gray-900">
                  {stateB.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-900">
                  {climate?.state_b?.trim()
                    ? formatCompareNumericText(climate.state_b.trim())
                    : stateUi.noData}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <CompareExternalStateAffordabilitySection
          stateAName={stateA.name}
          stateACode={stateA.code}
          stateBName={stateB.name}
          stateBCode={stateB.code}
          noDataLabel={stateUi.noData}
          locale={locale}
        />

        {faqItems.length > 0 ? (
          <SiteFaqAccordion
            items={faqItems.map((item) => ({
              question: item.q,
              answer: item.a
            }))}
            heading={stateUi.faqHeading}
            className="mt-10"
            headingClassName="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
            headingId="state-compare-faq-heading"
            idPrefix="state-compare-faq"
            headingToAccordionClassName="mt-4"
          />
        ) : null}

        <CompareExploreRelatedScholarships locale={locale} />

        {sources.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-compare-sources-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="state-compare-sources-heading"
                className="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
              >
                {stateUi.sourcesHeading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                {stateUi.sourcesIntro}
              </p>
            </div>
            <ul className="mt-5 space-y-4">
              {sources.map((source) => (
                <li
                  key={`${source.url}-${source.label}`}
                  className="text-base leading-relaxed text-gray-700"
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-700 underline decoration-blue-500/45 underline-offset-4 transition hover:text-blue-800 hover:decoration-blue-700"
                  >
                    {source.label}
                  </a>
                  <span className="text-gray-500">
                    {' '}
                    -{' '}
                    {source.type === 'official'
                      ? stateUi.sourceOfficial
                      : source.type === 'government'
                        ? stateUi.sourceGovernment
                        : stateUi.sourceAuthority}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relatedContent.resources.length > 0 ||
        relatedContent.essays.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-related-guides-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="state-related-guides-heading"
                className="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
              >
                {stateUi.relatedHeading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                {stateUi.relatedIntro(stateA.name, stateB.name)}
              </p>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              {relatedContent.resources.length > 0 ? (
                <section aria-labelledby="state-related-resources-heading">
                  <h3
                    id="state-related-resources-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {stateUi.relatedResourcesSub}
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {relatedContent.resources.map((post) => {
                      const slugValue = post.slug?.trim();
                      if (!slugValue) return null;
                      return (
                        <li
                          key={post.id}
                          className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
                        >
                          <Link
                            href={resourcesArticlePath(slugValue)}
                            className="text-base font-semibold text-gray-900 underline decoration-sky-500/30 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                          >
                            {post.title?.trim() || slugValue.replace(/-/g, ' ')}
                          </Link>
                          {post.meta_description?.trim() ? (
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                              {post.meta_description.trim()}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {relatedContent.essays.length > 0 ? (
                <section aria-labelledby="state-related-essays-heading">
                  <h3
                    id="state-related-essays-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {stateUi.relatedEssaysSub}
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {relatedContent.essays.map((essayGuide) => (
                      <li
                        key={essayGuide.id}
                        className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
                      >
                        <Link
                          href={essayHubArticlePath(essayGuide.slug)}
                          className="text-base font-semibold text-gray-900 underline decoration-indigo-500/30 underline-offset-4 transition hover:text-indigo-800 hover:decoration-indigo-700"
                        >
                          {essayGuide.title?.trim() ||
                            essayGuide.slug.replace(/-/g, ' ')}
                        </Link>
                        {essayGuide.meta_description?.trim() ? (
                          <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            {essayGuide.meta_description.trim()}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
