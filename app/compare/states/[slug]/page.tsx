import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import clsx from 'clsx';

import CompareExploreRelatedScholarships from '@/components/compare/CompareExploreRelatedScholarships';
import CompareTableOfContents from '@/components/compare/CompareTableOfContents';
import CompareThinVerdictExplanation from '@/components/compare/CompareThinVerdictExplanation';
import { SafeCompareHtml } from '@/components/compare/SafeCompareHtml';
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

const COMPARE_YEAR = 2026;
export const revalidate = 300;

function buildUniversityHubHref(
  stateSlug: string | null | undefined,
  universitySlug: string | null | undefined
) {
  const normalizedState = stateSlug?.trim();
  const normalizedUniversity = universitySlug?.trim();
  if (!normalizedState || !normalizedUniversity) return null;
  return `/scholarships/${encodeURIComponent(normalizedState)}/${encodeURIComponent(normalizedUniversity)}`;
}

function fmtUsd(n: unknown): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data available';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
}

function fmtNum(n: unknown, digits = 0): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data available';
  return n.toFixed(digits);
}

function grantBadgeLabel(raw: unknown): string {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return '—';
  const n = Math.round(raw);
  return `${n} grant${n === 1 ? '' : 's'}`;
}

function TopScholarshipProvidersColumn({
  stateName,
  stateSlug,
  items,
  browseHref
}: {
  stateName: string;
  stateSlug: string | null | undefined;
  items: Array<Record<string, unknown>>;
  browseHref: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Top Scholarship Providers in {stateName}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        Ranked by number of active scholarships
      </p>
      {browseHref ? (
        <p className="mt-3">
          <Link
            href={browseHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            View all scholarships
            <span aria-hidden>→</span>
          </Link>
        </p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => {
            const hubHref = buildUniversityHubHref(
              stateSlug,
              typeof item['slug'] === 'string' ? item['slug'] : null
            );
            const name = String(item['name'] ?? 'Unknown');
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
                    <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{name}</span>
                  )}
                </div>
                <span className="inline-flex min-w-[4.5rem] shrink-0 justify-end text-right sm:min-w-[5rem]">
                  <span className="min-w-[2.5rem] rounded px-2 py-1 text-xs font-semibold tabular-nums bg-orange-100 text-orange-600">
                    {grantBadgeLabel(item['grant_count'])}
                  </span>
                </span>
              </li>
            );
          })
        ) : (
          <li className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
            No data available.
          </li>
        )}
      </ul>
    </div>
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await fetchPublishedStateComparePageBySlug(slug.trim().toLowerCase());
  const base = getURL().replace(/\/$/, '');
  const path = `/compare/states/${encodeURIComponent(slug.trim().toLowerCase())}`;
  if (!row) {
    return {
      title: 'State vs State',
      robots: { index: false, follow: false }
    };
  }
  const title =
    row.page.meta_title?.trim() ||
    `${row.stateA.name} vs ${row.stateB.name}: Scholarship Climate ${COMPARE_YEAR}`;
  const fallbackDescription =
    row.page.meta_description?.trim() ||
    `Compare scholarship climate, grant volume, and top universities in ${row.stateA.name} and ${row.stateB.name}.`;
  const description =
    (await resolveAiMetaDescription({
      canonicalPath: path,
      routeKind: 'compare_state',
      title,
      fallbackDescription,
      context: {
        slug: slug.trim().toLowerCase(),
        stateA: row.stateA.name,
        stateB: row.stateB.name
      },
      priority: 6
    })) ?? fallbackDescription;
  return {
    title,
    description,
    alternates: { canonical: `${base}${path}` },
    openGraph: { title, description, url: `${base}${path}` }
  };
}

export default async function StateComparePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const slug = raw.trim().toLowerCase();
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
    ? `/scholarships/${encodeURIComponent(stateA.slug.trim())}`
    : null;
  const topStateBHref = stateB.slug?.trim()
    ? `/scholarships/${encodeURIComponent(stateB.slug.trim())}`
    : null;
  const relatedContent = await fetchCompareRelatedContent({
    instAName: stateA.name,
    instBName: stateB.name,
    stateA: stateA.name,
    stateB: stateB.name,
    pageTitle:
      page.meta_title?.trim() ||
      `${stateA.name} vs ${stateB.name}: Scholarship Climate ${COMPARE_YEAR}`,
    aiVerdict: page.ai_verdict,
    bodyHtml: bodyHtmlAnchored,
    essayTextA: climate?.state_a,
    essayTextB: climate?.state_b,
    limit: 3
  });

  const compareTocItems = buildStateCompareTocMerged({
    bodyToc: bodyTocItems,
    hasClimateEssay: Boolean(climate?.state_a?.trim() || climate?.state_b?.trim()),
    faqCount: faqItems.length,
    sourcesCount: sources.length,
    hasRelated:
      relatedContent.resources.length > 0 || relatedContent.essays.length > 0
  });

  const documentTitle =
    page.meta_title?.trim() ||
    `${stateA.name} vs ${stateB.name}: Scholarship Climate ${COMPARE_YEAR}`;
  const fallbackDescriptionMeta =
    page.meta_description?.trim() ||
    `Compare scholarship climate, grant volume, and top universities in ${stateA.name} and ${stateB.name}.`;
  const resolvedMetaDescription =
    (await resolveAiMetaDescription({
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
    })) ?? fallbackDescriptionMeta;

  const comparePageAbsoluteUrl = getURL(canonicalPath.replace(/^\/+/, ''));

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: getURL('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Compare',
        item: getURL('compare')
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'State vs State',
        item: getURL('compare/states')
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
    typeof a?.['grant_count'] === 'number' && !Number.isNaN(a['grant_count'] as number)
      ? (a['grant_count'] as number)
      : null;
  const grantCountB =
    typeof b?.['grant_count'] === 'number' && !Number.isNaN(b['grant_count'] as number)
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
            href="/compare/states"
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            ← Back to State vs State
          </Link>
        </p>

        <nav className="mt-4 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link href="/" className="font-medium text-gray-600 transition hover:text-gray-900">
                Home
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href="/compare"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                Compare
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href="/compare/states"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                State vs State
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
            {stateA.name} vs {stateB.name}: Scholarship Climate {COMPARE_YEAR}
          </h1>
          {page.ai_verdict?.trim() ? (
            <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
              <span className="font-semibold text-gray-900">Which climate fits best? </span>
              {page.ai_verdict.trim()}
            </p>
          ) : null}
        </header>

        <CompareTableOfContents
          items={compareTocItems}
          labelId="compare-state-toc-label"
        />

        <section className="mt-8 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            State vs State
          </span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Institution A</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">{stateA.name}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Institution B</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">{stateB.name}</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2
            id="compare-state-quick-heading"
            className="scroll-mt-28 text-center text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
          >
            Quick comparison
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
                  <th className="px-3 py-3 font-semibold text-gray-800 sm:px-4">Metric</th>
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
                    Active scholarships in catalog
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(a?.['grant_count'], 0)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(b?.['grant_count'], 0)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    Avg. award (where known)
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(a?.['avg_amount'])}</td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(b?.['avg_amount'])}</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    Max indexed award
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(a?.['max_amount'])}</td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(b?.['max_amount'])}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {bodyHtmlAnchored.trim() ? (
            <div className="mt-8 border-t border-gray-100 pt-8 [&_h2[id]]:scroll-mt-28 [&_h2[id]]:sm:scroll-mt-24 [&_h3[id]]:scroll-mt-28 [&_h3[id]]:sm:scroll-mt-24 sm:pt-10">
              <SafeCompareHtml html={bodyHtmlAnchored} />
            </div>
          ) : null}
        </section>

        {showThinVerdict ? (
          <CompareThinVerdictExplanation
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
          aria-label="Top scholarship providers in each state"
        >
          <TopScholarshipProvidersColumn
            stateName={stateA.name}
            stateSlug={stateA.slug}
            items={topA}
            browseHref={topStateAHref}
          />
          <TopScholarshipProvidersColumn
            stateName={stateB.name}
            stateSlug={stateB.slug}
            items={topB}
            browseHref={topStateBHref}
          />
        </section>

        <section
          className="mt-10 rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5"
          aria-label="Scholarship matches call to action"
        >
          <div className="mx-auto flex items-center justify-center gap-3 sm:gap-4">
            <span className="text-2xl leading-none sm:text-[1.7rem]" aria-hidden>
              🎯
            </span>
            <h2
              id="compare-state-cta-heading"
              className="scroll-mt-28 text-left text-xl font-bold leading-[1.08] tracking-tight text-indigo-950 sm:scroll-mt-24 sm:text-[1.65rem] md:text-[1.85rem] md:whitespace-nowrap"
            >
              Get matched with scholarships in 2 minutes
            </h2>
          </div>
          <HomePrimaryCtaClient
            className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
          >
            Find My Scholarships
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
              Scholarship climate by state
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-gray-900">{stateA.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-900">
                  {climate?.state_a?.trim() || 'No data available'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-gray-900">{stateB.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-900">
                  {climate?.state_b?.trim() || 'No data available'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <SiteFaqAccordion
            items={faqItems.map((item) => ({
              question: item.q,
              answer: item.a
            }))}
            className="mt-10"
            headingClassName="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
            headingId="state-compare-faq-heading"
            idPrefix="state-compare-faq"
            headingToAccordionClassName="mt-4"
          />
        ) : null}

        <CompareExploreRelatedScholarships />

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
                Sources and official pages
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Official and high-authority pages used to support this State vs State comparison.
              </p>
            </div>
            <ul className="mt-5 space-y-4">
              {sources.map((source) => (
                <li key={`${source.url}-${source.label}`} className="text-base leading-relaxed text-gray-700">
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
                      ? 'official source'
                      : source.type === 'government'
                        ? 'government reference'
                        : 'high-authority reference'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relatedContent.resources.length > 0 || relatedContent.essays.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-related-guides-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="state-related-guides-heading"
                className="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
              >
                More guides around this State vs State comparison
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Internal reading paths around scholarship search, application strategy, and essay preparation for students comparing {stateA.name} and {stateB.name}.
              </p>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              {relatedContent.resources.length > 0 ? (
                <section aria-labelledby="state-related-resources-heading">
                  <h3
                    id="state-related-resources-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Related scholarship articles
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {relatedContent.resources.map((post) => {
                      const slugValue = post.slug?.trim();
                      if (!slugValue) return null;
                      return (
                        <li key={post.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
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
                    Related essay guides
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
                          {essayGuide.title?.trim() || essayGuide.slug.replace(/-/g, ' ')}
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
