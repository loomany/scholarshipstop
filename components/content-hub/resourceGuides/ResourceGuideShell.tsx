import Link from 'next/link';
import clsx from 'clsx';

import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { contentHubProseClassName } from '@/lib/content-hub/contentHubProseClassName';
import {
  RESOURCE_GUIDE_CARDS,
  resourceGuideCardHref,
  resourceGuideLinkClassName
} from '@/lib/content-hub/resourceGuidePages';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';

export type ResourceGuideFaqItem = { question: string; answer: string };

export type ResourceGuideEndLink = {
  href: string;
  title: string;
  blurb: string;
};

export type ResourceGuideShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  faq: ResourceGuideFaqItem[];
  endReading: ResourceGuideEndLink[];
};

export default function ResourceGuideShell({
  title,
  subtitle,
  children,
  faq,
  endReading
}: ResourceGuideShellProps) {
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
        name: RESOURCES_PAGE_TITLE,
        item: getURL(RESOURCES_SECTION_PATH)
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title
      }
    ]
  };

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-zinc-50 pb-16 pt-10 sm:pb-24 sm:pt-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <article className="mx-auto max-w-3xl px-5 sm:px-6">
        <nav className="mb-8 text-sm" aria-label="Breadcrumb">
          <Link href="/" className={clsx(nav.legal, 'inline-block')}>
            ← Back to home
          </Link>
          <span className="mx-2 text-zinc-300" aria-hidden>
            /
          </span>
          <Link
            href={RESOURCES_SECTION_PATH}
            className="font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            {RESOURCES_PAGE_TITLE}
          </Link>
        </nav>

        <header className="mb-10 sm:mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600 sm:text-xl sm:leading-relaxed">
            {subtitle}
          </p>
        </header>

        <div className={clsx(contentHubProseClassName, 'max-w-none')}>{children}</div>

        {faq.length > 0 ? (
          <SiteFaqAccordion
            items={faq}
            className="mt-12"
            headingId="guide-faq-heading"
            headingClassName="text-lg font-bold tracking-tight text-zinc-900"
            idPrefix="resource-guide-faq"
          />
        ) : null}

        <section
          className="mt-12 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm sm:mt-14 sm:p-8"
          aria-labelledby="continue-reading-heading"
        >
          <h2
            id="continue-reading-heading"
            className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg"
          >
            Continue Reading
          </h2>
          <ul className="mt-5 list-none space-y-4 p-0">
            {endReading.map((item) => (
              <li key={item.href} className="text-sm leading-relaxed sm:text-base">
                <Link href={item.href} className={resourceGuideLinkClassName}>
                  {item.title}
                </Link>
                <span className="text-zinc-600"> — {item.blurb}</span>
              </li>
            ))}
          </ul>
        </section>

        <ContentHubScholarshipCta
          className="mt-10 sm:mt-12"
          title="Find Scholarships That Match You"
          description="Browse scholarships based on your profile and apply faster."
          buttonText="Find Scholarships"
        />

        <section
          className="mt-12 sm:mt-14"
          aria-labelledby="related-guides-heading"
        >
          <h2
            id="related-guides-heading"
            className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
          >
            Related Guides
          </h2>
          <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3 sm:gap-5">
            {RESOURCE_GUIDE_CARDS.map((card) => (
              <li key={card.slug}>
                <Link
                  href={resourceGuideCardHref(card.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 sm:p-6"
                >
                  <span className="text-base font-semibold tracking-tight text-zinc-900 group-hover:text-orange-700">
                    {card.title}
                  </span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
                    {card.description}
                  </span>
                  <span className="mt-4 text-sm font-semibold text-blue-700 group-hover:text-blue-900">
                    Read guide →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
