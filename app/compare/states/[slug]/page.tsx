import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SafeCompareHtml } from '@/components/compare/SafeCompareHtml';
import {
  fetchPublishedStateComparePageBySlug,
  fetchStateComparisonDataRpc,
  stateComparisonGrantCountsOk,
  stateContentJsonAsRecord
} from '@/lib/seo/stateCompareServer';
import { getURL } from '@/utils/helpers';

const COMPARE_YEAR = 2026;
export const revalidate = 3600;

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

  const topA = Array.isArray(a?.['top_universities'])
    ? (a?.['top_universities'] as Array<Record<string, unknown>>)
    : [];
  const topB = Array.isArray(b?.['top_universities'])
    ? (b?.['top_universities'] as Array<Record<string, unknown>>)
    : [];

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
    <article className="min-h-screen bg-[#F3F7FA] px-4 py-10 sm:px-6 lg:px-8">
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

      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            ScholarshipTop · {COMPARE_YEAR}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {stateA.name} vs {stateB.name}: Scholarship Climate {COMPARE_YEAR}
          </h1>
          {page.ai_verdict?.trim() ? (
            <p className="mx-auto mt-4 max-w-3xl text-pretty text-lg leading-relaxed text-zinc-700">
              <span className="font-semibold text-zinc-900">Which climate fits best? </span>
              {page.ai_verdict.trim()}
            </p>
          ) : null}
        </header>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-slate-50/90">
                <th className="px-4 py-3 font-semibold text-zinc-800">Metric</th>
                <th className="px-4 py-3 font-semibold text-emerald-900">
                  {stateA.name}
                </th>
                <th className="px-4 py-3 font-semibold text-emerald-900">
                  {stateB.name}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">State region</td>
                <td className="px-4 py-3 text-zinc-900">{stateA.region}</td>
                <td className="px-4 py-3 text-zinc-900">{stateB.region}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">
                  Active scholarships in catalog
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-900">
                  {fmtNum(a?.['grant_count'], 0)}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-900">
                  {fmtNum(b?.['grant_count'], 0)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">
                  Avg. award (where known)
                </td>
                <td className="px-4 py-3">{fmtUsd(a?.['avg_amount'])}</td>
                <td className="px-4 py-3">{fmtUsd(b?.['avg_amount'])}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-zinc-700">
                  Max indexed award
                </td>
                <td className="px-4 py-3">{fmtUsd(a?.['max_amount'])}</td>
                <td className="px-4 py-3">{fmtUsd(b?.['max_amount'])}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Top universities in {stateA.name}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              {topA.length > 0 ? (
                topA.map((item, index) => (
                  <li
                    key={`${String(item['slug'] ?? item['name'])}-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="font-medium text-zinc-900">
                      {String(item['name'] ?? 'Unknown university')}
                    </span>
                    <span className="tabular-nums text-zinc-500">
                      {fmtNum(item['grant_count'], 0)}
                    </span>
                  </li>
                ))
              ) : (
                <li>No data available.</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Top universities in {stateB.name}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              {topB.length > 0 ? (
                topB.map((item, index) => (
                  <li
                    key={`${String(item['slug'] ?? item['name'])}-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="font-medium text-zinc-900">
                      {String(item['name'] ?? 'Unknown university')}
                    </span>
                    <span className="tabular-nums text-zinc-500">
                      {fmtNum(item['grant_count'], 0)}
                    </span>
                  </li>
                ))
              ) : (
                <li>No data available.</li>
              )}
            </ul>
          </div>
        </section>

        {bodyHtml.trim() ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <SafeCompareHtml html={bodyHtml} />
          </div>
        ) : null}

        {climate?.state_a || climate?.state_b ? (
          <section
            className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            aria-labelledby="state-climate-heading"
          >
            <h2
              id="state-climate-heading"
              className="text-lg font-semibold text-zinc-900"
            >
              Scholarship climate by state
            </h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  {stateA.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {climate?.state_a?.trim() || 'No data available'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  {stateB.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {climate?.state_b?.trim() || 'No data available'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <section
            className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            aria-labelledby="state-compare-faq-heading"
          >
            <h2
              id="state-compare-faq-heading"
              className="text-lg font-semibold text-zinc-900"
            >
              FAQ
            </h2>
            <dl className="mt-4 space-y-4">
              {faqItems.map((item, i) => (
                <div key={`${item.q}-${i}`} className="border-b border-zinc-100 pb-4 last:border-0">
                  <dt className="font-medium text-zinc-900">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}
