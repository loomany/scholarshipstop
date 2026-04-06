'use client';

import Link from 'next/link';

import {
  RESOURCE_GUIDE_SLUGS,
  resourceGuideHref
} from '@/lib/scholarships/resourceGuideRoutes';

const linkClass = 'font-medium text-blue-600 underline-offset-2 hover:underline';

const LINK_COPY: Record<
  (typeof RESOURCE_GUIDE_SLUGS)[number],
  { title: string; after: string }
> = {
  'how-to-apply-for-scholarships': {
    title: 'How to Apply for Scholarships',
    after: 'helps with practical application strategy.'
  },
  'scholarship-deadlines-explained': {
    title: 'Scholarship Deadlines Explained',
    after: 'provides tips to manage important timelines.'
  },
  'combine-multiple-scholarships': {
    title: 'Can You Combine Multiple Scholarships',
    after: 'clarifies stacking awards legally and effectively.'
  }
};

/**
 * Internal links to static resource guides — root-absolute hrefs only (next/link).
 */
export default function SeoAdditionalResourceGuidesLinks() {
  return (
    <section
      className="space-y-2"
      aria-labelledby="seo-additional-resources-heading"
    >
      <h2
        id="seo-additional-resources-heading"
        className="text-base font-semibold text-zinc-900"
      >
        Additional Resources
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 md:text-base">
        {RESOURCE_GUIDE_SLUGS.map((slug) => {
          const href = resourceGuideHref(slug);
          const { title, after } = LINK_COPY[slug];
          return (
            <li key={slug}>
              <Link href={href} className={linkClass}>
                {title}
              </Link>{' '}
              {after}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
