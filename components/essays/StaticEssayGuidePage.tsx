import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import ArticleTrustByline from '@/components/content-hub/ArticleTrustByline';
import { HealthcareCareerGoalsPlanningSection } from '@/components/content-hub/HealthcareCareerGoalsPlanningSection';
import { PremedTopicContextCard } from '@/components/content-hub/PremedTopicContextCard';
import {
  articleAuthorJsonLd,
  articleReviewerJsonLd
} from '@/lib/seo/articleTrust';
import type { StaticEssayGuide } from '@/lib/essays/staticEssayGuides';
import {
  ESSAYS_PAGE_TITLE,
  ESSAYS_SECTION_PATH,
  essayHubArticlePath
} from '@/lib/essays/essayHubSection';
import {
  buildMedicalClusterLinks,
  resolveHealthcareEssayTopicContext
} from '@/lib/external-data';
import { normalizeInternalLinkHref } from '@/lib/external-data/internalLinkGraph';
import { getURL } from '@/utils/helpers';

type StaticEssayGuidePageCopy = {
  home: string;
  essays: string;
  eyebrow: string;
  inOneSentence: string;
  openEssayMentor: string;
  findScholarships: string;
  practicalChecklist: string;
  examples: string;
  doDont: string;
  do: string;
  dont: string;
  relatedPages: string;
  faq: string;
  disclaimer: string;
};

const DEFAULT_COPY: StaticEssayGuidePageCopy = {
  home: 'Home',
  essays: ESSAYS_PAGE_TITLE,
  eyebrow: 'ScholarshipTop essay guide',
  inOneSentence: 'In one sentence',
  openEssayMentor: 'Open Essay Mentor',
  findScholarships: 'Find scholarships',
  practicalChecklist: 'Practical checklist',
  examples: 'Examples',
  doDont: 'Do / Do not',
  do: 'Do',
  dont: 'Do not',
  relatedPages: 'Related ScholarshipTop pages',
  faq: 'FAQ',
  disclaimer:
    'ScholarshipTop helps students plan, draft, refine, and align essays with scholarship requirements so they can prepare stronger applications faster.'
};

type StaticEssayGuidePageProps = {
  guide: StaticEssayGuide;
  locale?: string;
  copy?: StaticEssayGuidePageCopy;
  hrefForPath?: (href: string) => string;
  urlForPath?: (path: string) => string;
};

function shouldShowHealthcareEssayContext(guide: StaticEssayGuide): boolean {
  return guide.slug === 'career-goals';
}

function filterCareerGoalsRelatedLinks(
  guide: StaticEssayGuide
): StaticEssayGuide['links'] {
  if (guide.slug !== 'career-goals') return guide.links;

  const clusterHrefs = new Set(
    buildMedicalClusterLinks({ surface: 'career-goals' }).map((link) =>
      normalizeInternalLinkHref(link.href)
    )
  );

  return guide.links.filter(
    (link) => !clusterHrefs.has(normalizeInternalLinkHref(link.href))
  );
}

export function StaticEssayGuidePage({
  guide,
  locale = 'en',
  copy = DEFAULT_COPY,
  hrefForPath = (href) => href,
  urlForPath = (path) => getURL(path)
}: StaticEssayGuidePageProps) {
  const path = essayHubArticlePath(guide.slug);
  const articleUrl = urlForPath(path);
  const topicContext = shouldShowHealthcareEssayContext(guide)
    ? resolveHealthcareEssayTopicContext({
        slug: guide.slug,
        title: guide.title,
        category: guide.description
      })
    : null;
  const relatedLinks = filterCareerGoalsRelatedLinks(guide);
  const localizedEssaysPath = hrefForPath(ESSAYS_SECTION_PATH);
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.home,
        item: urlForPath('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.essays,
        item: urlForPath(ESSAYS_SECTION_PATH)
      },
      { '@type': 'ListItem', position: 3, name: guide.h1, item: articleUrl }
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
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: articleAuthorJsonLd(),
    reviewedBy: articleReviewerJsonLd(),
    publisher: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: getURL()
    }
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
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
              <Link
                href={hrefForPath('/')}
                className="font-medium text-gray-600 hover:text-gray-900"
              >
                {copy.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={localizedEssaysPath}
                className="font-medium text-gray-600 hover:text-gray-900"
              >
                {copy.essays}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {guide.h1}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-gray-950 sm:text-5xl">
            {guide.h1}
          </h1>
          <ArticleTrustByline
            dateLine={`Updated ${new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }).format(new Date(guide.updatedAt))}`}
            className="mt-4"
          />
          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
            {guide.intro}
          </p>
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              {copy.inOneSentence}
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-orange-950">
              {guide.oneSentence}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={hrefForPath('/essay')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {copy.openEssayMentor}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={hrefForPath('/scholarships')}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {copy.findScholarships}
            </Link>
          </div>
        </header>

        <PremedTopicContextCard
          context={topicContext}
          className="mt-8"
          compact
          showRelatedLinks={guide.slug !== 'career-goals'}
        />

        {guide.slug === 'career-goals' ? (
          <HealthcareCareerGoalsPlanningSection />
        ) : null}

        <section className="mt-10 grid gap-5">
          {guide.sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-gray-200 bg-gray-50/70 p-6"
            >
              <h2 className="text-2xl font-bold tracking-tight text-gray-950">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {section.body}
              </p>
              <ul className="mt-4 space-y-2 text-base leading-7 text-gray-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <CheckCircle2
                      className="mt-1 h-5 w-5 shrink-0 text-orange-500"
                      aria-hidden
                    />
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

        <section className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              {copy.doDont}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] table-fixed text-left text-sm">
              <thead className="bg-white text-gray-500">
                <tr>
                  <th className="w-1/2 px-5 py-3 font-semibold">{copy.do}</th>
                  <th className="w-1/2 px-5 py-3 font-semibold">{copy.dont}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guide.doDont.map((row) => (
                  <tr key={`${row.do}-${row.dont}`}>
                    <td className="px-5 py-4 align-top text-gray-700">
                      {row.do}
                    </td>
                    <td className="px-5 py-4 align-top text-gray-700">
                      {row.dont}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/70 p-6">
          <h2 className="text-xl font-bold tracking-tight text-orange-950">
            {copy.relatedPages}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
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

        <section className="mt-10" aria-labelledby="static-essay-faq-heading">
          <h2
            id="static-essay-faq-heading"
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
