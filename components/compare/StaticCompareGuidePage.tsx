import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import type { StaticCompareGuide } from '@/lib/compare/staticCompareGuides';
import { getURL } from '@/utils/helpers';

export function StaticCompareGuidePage({
  guide
}: {
  guide: StaticCompareGuide;
}) {
  const path = `/compare/${encodeURIComponent(guide.slug)}`;
  const pageUrl = getURL(path);
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: getURL('/') },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: getURL('/compare') },
      { '@type': 'ListItem', position: 3, name: guide.h1, item: pageUrl }
    ]
  };
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: pageUrl,
    headline: guide.title,
    description: guide.description,
    url: pageUrl,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: { '@type': 'Organization', name: 'ScholarshipTop', url: getURL() },
    publisher: { '@type': 'Organization', name: 'ScholarshipTop', url: getURL() }
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };

  return (
    <main className="bg-white text-gray-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <p>
          <Link
            href="/compare"
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            Back to Compare
          </Link>
        </p>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            ScholarshipTop comparison
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl">
            {guide.h1}
          </h1>
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              Short answer
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-orange-950">
              {guide.shortAnswer}
            </p>
          </div>
        </header>

        <section className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              Quick comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[38%]" />
                <col className="w-[38%]" />
              </colgroup>
              <thead className="bg-white text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Factor</th>
                  <th className="px-5 py-3 font-semibold">{guide.columns[0]}</th>
                  <th className="px-5 py-3 font-semibold">{guide.columns[1]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guide.rows.map((row) => (
                  <tr key={row.factor}>
                    <td className="px-5 py-4 align-top font-semibold text-gray-900">
                      {row.factor}
                    </td>
                    <td className="px-5 py-4 align-top text-gray-700">
                      {row.left}
                    </td>
                    <td className="px-5 py-4 align-top text-gray-700">
                      {row.right}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              Choose {guide.columns[0]} when
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
              {guide.chooseLeft.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              Choose {guide.columns[1]} when
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
              {guide.chooseRight.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-gray-950">
            Decision checklist
          </h2>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-gray-700 sm:grid-cols-2">
            {guide.checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/70 p-6">
          <h2 className="text-xl font-bold tracking-tight text-orange-950">
            Continue your scholarship search
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/scholarships"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            Find scholarships
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className="mt-10" aria-labelledby="compare-static-faq-heading">
          <h2
            id="compare-static-faq-heading"
            className="text-2xl font-bold tracking-tight text-gray-950"
          >
            FAQ
          </h2>
          <div className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {guide.faq.map((item, i) => (
              <details key={item.question} open={i === 0}>
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-gray-900 marker:content-none hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  {item.question}
                </summary>
                <p className="border-t border-gray-100 px-5 pb-4 pt-3 text-sm leading-6 text-gray-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm leading-6 text-gray-600">
          Scholarship details, eligibility rules, and provider terminology can
          change. Always confirm final requirements on the official provider or
          institution page before applying.
        </p>
      </article>
    </main>
  );
}
