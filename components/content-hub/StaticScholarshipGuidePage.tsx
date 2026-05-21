import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import type { StaticScholarshipGuide } from '@/lib/resources/staticScholarshipGuides';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';

type StaticScholarshipGuidePageCopy = {
  home: string;
  resources: string;
  eyebrow: string;
  findScholarships: string;
  verificationMethodology: string;
  practicalChecklist: string;
  examples: string;
  relatedPages: string;
  faq: string;
  disclaimer: string;
};

const DEFAULT_COPY: StaticScholarshipGuidePageCopy = {
  home: 'Home',
  resources: RESOURCES_PAGE_TITLE,
  eyebrow: 'ScholarshipTop guide',
  findScholarships: 'Find scholarships',
  verificationMethodology: 'Verification methodology',
  practicalChecklist: 'Practical checklist',
  examples: 'Examples',
  relatedPages: 'Related ScholarshipTop pages',
  faq: 'FAQ',
  disclaimer:
    'ScholarshipTop does not provide scholarships directly. Always confirm final requirements, deadlines, payout, and application steps on the official provider page.'
};

type StaticScholarshipGuidePageProps = {
  guide: StaticScholarshipGuide;
  locale?: string;
  copy?: StaticScholarshipGuidePageCopy;
  hrefForPath?: (href: string) => string;
  urlForPath?: (path: string) => string;
};

export default function StaticScholarshipGuidePage({
  guide,
  locale = 'en',
  copy = DEFAULT_COPY,
  hrefForPath = (href) => href,
  urlForPath = (path) => getURL(path)
}: StaticScholarshipGuidePageProps) {
  const path = resourcesArticlePath(guide.slug);
  const articleUrl = urlForPath(path);
  const resourcesHubHref = hrefForPath(RESOURCES_SECTION_PATH);
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: copy.home, item: urlForPath('/') },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.resources,
        item: urlForPath(RESOURCES_SECTION_PATH)
      },
      { '@type': 'ListItem', position: 3, name: guide.title, item: articleUrl }
    ]
  };
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    inLanguage: locale,
    mainEntityOfPage: articleUrl,
    headline: guide.title,
    description: guide.description,
    url: articleUrl,
    datePublished: '2026-05-16',
    dateModified: '2026-05-16',
    author: { '@type': 'Organization', name: 'ScholarshipTop' },
    publisher: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: getURL()
    }
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link href={hrefForPath('/')} className="font-medium text-gray-600 hover:text-gray-900">
                {copy.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={resourcesHubHref}
                className="font-medium text-gray-600 hover:text-gray-900"
              >
                {copy.resources}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {guide.title}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{guide.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={hrefForPath('/scholarships')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {copy.findScholarships}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={hrefForPath('/scholarship-verification-methodology')}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {copy.verificationMethodology}
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-5">
          {guide.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-950">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-gray-600">{section.body}</p>
              <ul className="mt-4 space-y-2 text-base leading-7 text-gray-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              {copy.practicalChecklist}
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
              {guide.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              {copy.examples}
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              {guide.examples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/70 p-6">
          <h2 className="text-xl font-bold tracking-tight text-orange-950">
            Related ScholarshipTop pages
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <Link
                key={link.href}
                href={hrefForPath(link.href)}
                className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="static-guide-faq-heading">
          <h2
            id="static-guide-faq-heading"
            className="text-2xl font-bold tracking-tight text-gray-950"
          >
            {copy.faq}
          </h2>
          <div className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {guide.faq.map((item, i) => (
              <details key={item.question} open={i === 0} className="group">
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
          {copy.disclaimer}
        </p>
      </article>
    </main>
  );
}
