import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { SafeCompareHtml } from '@/components/compare/SafeCompareHtml';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { fetchCompareRelatedContent } from '@/lib/seo/compareRelatedContent';
import { parseCompareSources } from '@/lib/seo/compareSources';
import {
  fetchPublishedStateComparePageBySlug,
  fetchStateComparisonDataRpc,
  stateComparisonGrantCountsOk,
  stateContentJsonAsRecord
} from '@/lib/seo/stateCompareServer';
import { getURL } from '@/utils/helpers';

const COMPARE_YEAR = 2026;
export const revalidate = 3600;

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
      title: 'State comparison',
      robots: { index: false, follow: false }
    };
  }
  const title =
    row.page.meta_title?.trim() ||
    `${row.stateA.name} vs ${row.stateB.name}: Scholarship Climate ${COMPARE_YEAR}`;
  const description =
    row.page.meta_description?.trim() ||
    `Compare scholarship climate, grant volume, and top universities in ${row.stateA.name} and ${row.stateB.name}.`;
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
  const baseUrl = getURL().replace(/\/$/, '');
  const canonicalPath = `/compare/states/${encodeURIComponent(slug)}`;

  const content = stateContentJsonAsRecord(page.content_json);
  const bodyHtml =
    typeof content['body_html'] === 'string' ? content['body_html'] : '';
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
    bodyHtml,
    essayTextA: climate?.state_a,
    essayTextB: climate?.state_b,
    limit: 3
  });

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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${stateA.name} vs ${stateB.name}: Scholarship Climate ${COMPARE_YEAR}`,
            url: `${baseUrl}${canonicalPath}`,
            description: page.meta_description ?? undefined
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
            ← Back to State Battles
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
                State Battles
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

        <section className="mt-8 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            State battle
          </span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">State A</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">{stateA.name}</p>
              <p className="mt-2 text-sm text-gray-600">{stateA.region || 'Region unavailable'}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4">
              <p className="text-sm font-medium text-gray-500">State B</p>
              <p className="mt-2 text-xl font-bold leading-tight text-gray-900">{stateB.name}</p>
              <p className="mt-2 text-sm text-gray-600">{stateB.region || 'Region unavailable'}</p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-center text-xl font-bold tracking-tight text-gray-900">
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
                  <td className="px-3 py-3 font-medium text-gray-700 sm:px-4">State region</td>
                  <td className="px-3 py-3 text-gray-900 sm:px-4">{stateA.region || 'No data available'}</td>
                  <td className="px-3 py-3 text-gray-900 sm:px-4">{stateB.region || 'No data available'}</td>
                </tr>
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
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  Top universities in {stateA.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Institutions currently surfacing the most scholarships in this state.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-4">
              {topA.length > 0 ? (
                topA.map((item, index) => {
                  const universityName = String(item['name'] ?? 'Unknown university');
                  const href = buildUniversityHubHref(
                    stateA.slug,
                    typeof item['slug'] === 'string' ? item['slug'] : null
                  );
                  return (
                    <li
                      key={`${String(item['slug'] ?? item['name'])}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {href ? (
                          <Link
                            href={href}
                            className="font-semibold text-gray-900 underline decoration-sky-500/30 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                          >
                            {universityName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900">{universityName}</span>
                        )}
                        <span className="shrink-0 tabular-nums text-sm text-gray-500">
                          {fmtNum(item['grant_count'], 0)}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600">
                  No data available.
                </li>
              )}
            </ul>
            {topStateAHref ? (
              <p className="mt-5">
                <Link
                  href={topStateAHref}
                  className="text-sm font-semibold text-sky-700 underline decoration-sky-500/35 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                >
                  See all scholarships in {stateA.name} →
                </Link>
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  Top universities in {stateB.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Institutions currently surfacing the most scholarships in this state.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-4">
              {topB.length > 0 ? (
                topB.map((item, index) => {
                  const universityName = String(item['name'] ?? 'Unknown university');
                  const href = buildUniversityHubHref(
                    stateB.slug,
                    typeof item['slug'] === 'string' ? item['slug'] : null
                  );
                  return (
                    <li
                      key={`${String(item['slug'] ?? item['name'])}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {href ? (
                          <Link
                            href={href}
                            className="font-semibold text-gray-900 underline decoration-sky-500/30 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                          >
                            {universityName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900">{universityName}</span>
                        )}
                        <span className="shrink-0 tabular-nums text-sm text-gray-500">
                          {fmtNum(item['grant_count'], 0)}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600">
                  No data available.
                </li>
              )}
            </ul>
            {topStateBHref ? (
              <p className="mt-5">
                <Link
                  href={topStateBHref}
                  className="text-sm font-semibold text-sky-700 underline decoration-sky-500/35 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
                >
                  See all scholarships in {stateB.name} →
                </Link>
              </p>
            ) : null}
          </div>
        </section>

        {bodyHtml.trim() ? (
          <div className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <SafeCompareHtml html={bodyHtml} />
          </div>
        ) : null}

        {climate?.state_a || climate?.state_b ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-climate-heading"
          >
            <h2
              id="state-climate-heading"
              className="text-center text-xl font-bold tracking-tight text-gray-900"
            >
              Scholarship climate by state
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-emerald-900">{stateA.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {climate?.state_a?.trim() || 'No data available'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <h3 className="text-sm font-semibold text-emerald-900">{stateB.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
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
            headingId="state-compare-faq-heading"
            idPrefix="state-compare-faq"
            headingClassName="text-xl font-bold tracking-tight text-gray-900"
            headingToAccordionClassName="mt-4"
          />
        ) : null}

        {sources.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="state-compare-sources-heading"
          >
            <div className="max-w-2xl">
              <h2
                id="state-compare-sources-heading"
                className="text-xl font-bold tracking-tight text-gray-900"
              >
                Sources and official pages
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Official and high-authority pages used to support this state comparison.
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
                className="text-xl font-bold tracking-tight text-gray-900"
              >
                More guides around this comparison
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
