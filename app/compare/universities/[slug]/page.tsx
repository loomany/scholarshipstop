import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import CompareExploreRelatedScholarships from '@/components/compare/CompareExploreRelatedScholarships';
import CompareInstitutionScholarshipColumns from '@/components/compare/CompareInstitutionScholarshipColumns';
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
import { fetchPublishedStateCompareSlugByCodes } from '@/lib/seo/stateCompareServer';
import { fetchActiveScholarshipsByInstitutionIdForListing } from '@/lib/scholarships/supabase';
import {
  stateLabelFromSlug,
  stateSlugFromCode
} from '@/lib/seo/stateCompareSlug';
import {
  comparisonGrantCountsOk,
  contentJsonAsRecord,
  fetchComparisonDataRpc,
  fetchPublishedComparePageBySlug
} from '@/lib/seo/universityCompareServer';
import { injectH2H3IdsAndExtractToc } from '@/lib/content-hub/resourceArticleBodyToc';
import { buildUniversityCompareTocMerged } from '@/lib/seo/comparePageToc';
import {
  buildUniversityThinVerdictParagraphs,
  countWordsInCompareSources,
  isCompareArticleThin
} from '@/lib/seo/compareThinVerdictNarrative';
import { getURL } from '@/utils/helpers';
import { getCanonical } from '@/lib/seo/canonical';

const COMPARE_YEAR = 2026;
export const revalidate = 300;

function buildUniversityHubHref(stateCode: string | null | undefined, slug: string | null | undefined) {
  const stateSlug = stateCode ? stateSlugFromCode(stateCode) : null;
  const universitySlug = slug?.trim();
  if (!stateSlug || !universitySlug) return null;
  return `/scholarships/${encodeURIComponent(stateSlug)}/${encodeURIComponent(universitySlug)}`;
}

function fmtUsd(n: unknown): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data available';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
}

function fmtPct(n: unknown): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data available';
  return `${n}%`;
}

function fmtNum(n: unknown, digits = 0): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return 'No data available';
  return n.toFixed(digits);
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await fetchPublishedComparePageBySlug(slug.trim().toLowerCase());
  const path = `/compare/universities/${encodeURIComponent(slug.trim().toLowerCase())}`;
  const canonical = getCanonical(path);
  if (!row) {
    return {
      title: 'University vs University',
      robots: { index: false, follow: false }
    };
  }
  const title =
    row.page.meta_title?.trim() ||
    `${row.instA.name} vs ${row.instB.name}: Scholarship Comparison ${COMPARE_YEAR}`;
  const fallbackDescription =
    row.page.meta_description?.trim() ||
    `Compare scholarships and aid signals for ${row.instA.name} and ${row.instB.name}.`;
  const description =
    (await resolveAiMetaDescription({
      canonicalPath: path,
      routeKind: 'compare_university',
      title,
      fallbackDescription,
      context: {
        slug: slug.trim().toLowerCase(),
        institutionA: row.instA.name,
        institutionB: row.instB.name
      },
      priority: 6
    })) ?? fallbackDescription;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical }
  };
}

export default async function UniversityComparePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const slug = raw.trim().toLowerCase();
  const loaded = await fetchPublishedComparePageBySlug(slug);
  if (!loaded) notFound();

  const { page, instA, instB } = loaded;
  const [data, topScholarshipsA, topScholarshipsB] = await Promise.all([
    fetchComparisonDataRpc(instA.id, instB.id),
    fetchActiveScholarshipsByInstitutionIdForListing(instA.id, 3),
    fetchActiveScholarshipsByInstitutionIdForListing(instB.id, 3)
  ]);
  if (!comparisonGrantCountsOk(data)) notFound();
  const pageTitle =
    page.meta_title?.trim() ||
    `${instA.name} vs ${instB.name}: Scholarship Comparison ${COMPARE_YEAR}`;

  const a = data?.['institution_a'] as Record<string, unknown> | undefined;
  const b = data?.['institution_b'] as Record<string, unknown> | undefined;
  const canonicalPath = `/compare/universities/${encodeURIComponent(slug)}`;

  const content = contentJsonAsRecord(page.content_json);
  const bodyHtmlRaw =
    typeof content['body_html'] === 'string' ? content['body_html'] : '';
  const { html: bodyHtmlAnchored, toc: bodyTocItems } =
    injectH2H3IdsAndExtractToc(bodyHtmlRaw.trim(), {
      idSlugPrefix: 'compare-body'
    });
  const essay = content['essay_insights'] as
    | { inst_a?: string; inst_b?: string }
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

  const openA = a?.['open_grants'];
  const openB = b?.['open_grants'];
  const totalA = a?.['grant_count'];
  const totalB = b?.['grant_count'];
  const successA =
    typeof openA === 'number' && typeof totalA === 'number' && totalA > 0
      ? Math.round((100 * openA) / totalA)
      : null;
  const successB =
    typeof openB === 'number' && typeof totalB === 'number' && totalB > 0
      ? Math.round((100 * openB) / totalB)
      : null;

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

  const stateCodeA = instA.state?.trim().toUpperCase() || null;
  const stateCodeB = instB.state?.trim().toUpperCase() || null;
  const instAHref = buildUniversityHubHref(stateCodeA, instA.slug);
  const instBHref = buildUniversityHubHref(stateCodeB, instB.slug);
  const stateBattleSlugPromise =
    stateCodeA && stateCodeB && stateCodeA !== stateCodeB
      ? fetchPublishedStateCompareSlugByCodes(stateCodeA, stateCodeB)
      : Promise.resolve(null);
  const stateSlugA = stateCodeA ? stateSlugFromCode(stateCodeA) : null;
  const stateSlugB = stateCodeB ? stateSlugFromCode(stateCodeB) : null;
  const stateLabelA = stateSlugA ? stateLabelFromSlug(stateSlugA) : null;
  const stateLabelB = stateSlugB ? stateLabelFromSlug(stateSlugB) : null;
  const relatedContentPromise = fetchCompareRelatedContent({
    instAName: instA.name,
    instBName: instB.name,
    stateA: stateLabelA,
    stateB: stateLabelB,
    pageTitle,
    aiVerdict: page.ai_verdict,
    bodyHtml: bodyHtmlAnchored,
    essayTextA: essay?.inst_a,
    essayTextB: essay?.inst_b,
    limit: 3
  });

  const fallbackDescriptionMeta =
    page.meta_description?.trim() ||
    `Compare scholarships and aid signals for ${instA.name} and ${instB.name}.`;
  const resolvedMetaDescriptionPromise = resolveAiMetaDescription({
    canonicalPath,
    routeKind: 'compare_university',
    title: pageTitle,
    fallbackDescription: fallbackDescriptionMeta,
    context: {
      slug,
      institutionA: instA.name,
      institutionB: instB.name
    },
    priority: 6
  });

  const [stateBattleSlug, relatedContent, resolvedMetaDescriptionMaybe] =
    await Promise.all([
      stateBattleSlugPromise,
      relatedContentPromise,
      resolvedMetaDescriptionPromise
    ]);
  const resolvedMetaDescription =
    resolvedMetaDescriptionMaybe ?? fallbackDescriptionMeta;

  const compareTocItems = buildUniversityCompareTocMerged({
    bodyToc: bodyTocItems,
    hasEssayInsights: Boolean(essay?.inst_a?.trim() || essay?.inst_b?.trim()),
    hasStateBattle: Boolean(
      stateBattleSlug && stateLabelA && stateLabelB
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
        name: 'University vs University',
        item: getURL('compare/universities')
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: pageTitle,
        item: comparePageAbsoluteUrl
      }
    ]
  };

  const grantCountUniA =
    typeof totalA === 'number' && !Number.isNaN(totalA) ? totalA : null;
  const grantCountUniB =
    typeof totalB === 'number' && !Number.isNaN(totalB) ? totalB : null;

  const compareWordTotal = countWordsInCompareSources(
    bodyHtmlRaw,
    page.ai_verdict,
    essay?.inst_a,
    essay?.inst_b
  );
  const showThinVerdictUni = isCompareArticleThin(compareWordTotal);

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
            name: pageTitle,
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
            href="/compare/universities"
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            ← Back to University vs University
          </Link>
        </p>

        <nav className="mt-4 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href="/"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
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
                href="/compare/universities"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                University vs University
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li
              className="max-w-[min(100%,16rem)] truncate font-medium text-gray-900 sm:max-w-md"
              title={pageTitle}
            >
              {pageTitle}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {pageTitle}
          </h1>
          {page.ai_verdict?.trim() ? (
            <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
              <span className="font-semibold text-gray-900">Who is it for? </span>
              {formatCompareNumericText(page.ai_verdict.trim())}
            </p>
          ) : null}
        </header>

        <CompareTableOfContents
          items={compareTocItems}
          labelId="compare-university-toc-label"
        />

        <section className="mt-8 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            University vs University
          </span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Institution A</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">
                {instA.name}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Institution B</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">
                {instB.name}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2
            id="compare-uni-quick-heading"
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
                    <span className="block text-balance">{instA.name}</span>
                  </th>
                  <th className="px-3 py-3 font-semibold text-gray-900 sm:px-4">
                    <span className="block text-balance">{instB.name}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    Scholarships in catalog
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(totalA, 0)}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-900 sm:px-4">
                    {fmtNum(totalB, 0)}
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
                    Max award (index signal)
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(a?.['max_amount'])}</td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">{fmtUsd(b?.['max_amount'])}</td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    Open deadlines share
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {successA != null ? `${successA}%` : 'No data available'}
                  </td>
                  <td className="px-3 py-3 text-gray-700 sm:px-4">
                    {successB != null ? `${successB}%` : 'No data available'}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">
                    Merit vs need (approx.)
                  </td>
                  <td className="px-3 py-3 text-xs leading-snug text-gray-700 sm:px-4">
                    Merit {fmtPct(a?.['merit_pct'])} · Need {fmtPct(a?.['need_pct'])}
                  </td>
                  <td className="px-3 py-3 text-xs leading-snug text-gray-700 sm:px-4">
                    Merit {fmtPct(b?.['merit_pct'])} · Need {fmtPct(b?.['need_pct'])}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <UniversityCompareIqCta
          institutionA={instA.name}
          institutionB={instB.name}
        />

        {bodyHtmlAnchored.trim() ? (
          <div className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10 [&_h2[id]]:scroll-mt-28 [&_h2[id]]:sm:scroll-mt-24 [&_h3[id]]:scroll-mt-28 [&_h3[id]]:sm:scroll-mt-24">
            <SafeCompareHtml html={bodyHtmlAnchored} />
          </div>
        ) : null}

        {essay?.inst_a || essay?.inst_b ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="essay-insights-heading"
          >
            <h2
              id="essay-insights-heading"
              className="text-center text-xl font-bold tracking-tight text-gray-900"
            >
              Writing efforts
            </h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-sky-900">
                  {instAHref ? (
                    <Link
                      href={instAHref}
                      className="underline decoration-sky-500/35 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                    >
                      {instA.name}
                    </Link>
                  ) : (
                    instA.name
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {essay?.inst_a?.trim()
                    ? formatCompareNumericText(essay.inst_a.trim())
                    : 'No data available'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-sky-900">
                  {instBHref ? (
                    <Link
                      href={instBHref}
                      className="underline decoration-sky-500/35 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                    >
                      {instB.name}
                    </Link>
                  ) : (
                    instB.name
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {essay?.inst_b?.trim()
                    ? formatCompareNumericText(essay.inst_b.trim())
                    : 'No data available'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {showThinVerdictUni ? (
          <CompareThinVerdictExplanation
            paragraphs={buildUniversityThinVerdictParagraphs({
              year: COMPARE_YEAR,
              instAName: instA.name,
              instBName: instB.name,
              grantCountA: grantCountUniA,
              grantCountB: grantCountUniB
            })}
          />
        ) : null}

        <CompareInstitutionScholarshipColumns
          left={{ title: instA.name, href: instAHref, scholarships: topScholarshipsA }}
          right={{ title: instB.name, href: instBHref, scholarships: topScholarshipsB }}
        />

        <section
          className="mt-10 rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:px-6 sm:py-5"
          aria-label="Scholarship matches call to action"
        >
          <div className="mx-auto flex items-center justify-center gap-3 sm:gap-4">
            <span className="text-2xl leading-none sm:text-[1.7rem]" aria-hidden>
              🎯
            </span>
            <h2
              id="compare-uni-cta-heading"
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

        {stateBattleSlug && stateLabelA && stateLabelB ? (
          <section
            className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm sm:p-8"
            aria-labelledby="state-battle-link-heading"
          >
            <h2
              id="state-battle-link-heading"
              className="text-xl font-bold tracking-tight text-gray-900"
            >
              Not sure about the location?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Compare{' '}
              <Link
                href={`/compare/states/${encodeURIComponent(stateBattleSlug)}`}
                className="font-semibold text-emerald-900 underline decoration-emerald-500/50 underline-offset-2 hover:decoration-emerald-700"
              >
                {stateLabelA} vs {stateLabelB} scholarship markets
              </Link>{' '}
              to see how the broader state climate changes the funding picture.
            </p>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <SiteFaqAccordion
            items={faqItems.map((item) => ({
              question: item.q,
              answer: item.a
            }))}
            className="mt-10"
            headingId="compare-faq-heading"
            idPrefix="compare-faq"
            headingClassName="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
            headingToAccordionClassName="mt-4"
          />
        ) : null}

        <CompareExploreRelatedScholarships />

        {sources.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="compare-sources-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="compare-sources-heading"
                className="text-xl font-bold tracking-tight text-gray-900"
              >
                Sources and official pages
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Official university and high-authority pages used to support this comparison.
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
                    —{' '}
                    {source.type === 'official'
                      ? 'official university source'
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
            aria-labelledby="compare-related-guides-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="compare-related-guides-heading"
                className="text-xl font-bold tracking-tight text-gray-900"
              >
                More guides around this comparison
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Internal reading paths for students comparing {instA.name} and {instB.name},
                with extra scholarship context and essay-writing support.
              </p>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              {relatedContent.resources.length > 0 ? (
                <section aria-labelledby="compare-related-resources-heading">
                  <h3
                    id="compare-related-resources-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Related scholarship articles
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {relatedContent.resources.map((post) => {
                      const slug = post.slug?.trim();
                      if (!slug) return null;
                      return (
                        <li key={post.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                          <Link
                            href={resourcesArticlePath(slug)}
                            className="text-base font-semibold text-gray-900 underline decoration-sky-500/30 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                          >
                            {post.title?.trim() || slug.replace(/-/g, ' ')}
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
                <section aria-labelledby="compare-related-essays-heading">
                  <h3
                    id="compare-related-essays-heading"
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

function UniversityCompareIqCta({
  institutionA,
  institutionB
}: {
  institutionA: string;
  institutionB: string;
}) {
  return (
    <Link
      href="/iq/assessment?intent=college_fit"
      className="group relative mt-6 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:mt-8 sm:p-6"
      aria-labelledby="university-compare-iq-cta-heading"
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
              Featured Tool
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Decision fit
            </span>
          </div>
          <h2
            id="university-compare-iq-cta-heading"
            className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            Which college fits the way you think?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Before choosing between {institutionA} and {institutionB}, take a
            comprehensive cognitive assessment to see how your logic, speed, and
            pattern recognition shape your scholarship strategy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Logic', 'Speed', 'Patterns', 'Strategy'].map((item) => (
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
            Preview report
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
            Start IQ Test
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
