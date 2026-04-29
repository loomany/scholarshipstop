'use client';

import Link from 'next/link';

import {
  RESOURCE_GUIDE_SLUGS,
  resourceGuideHref
} from '@/lib/scholarships/resourceGuideRoutes';

const LISTING_GUIDE_SLUGS = [
  'how-to-apply-for-scholarships',
  'scholarship-deadlines-explained'
] as const satisfies readonly (typeof RESOURCE_GUIDE_SLUGS)[number][];

const CARD_CLASS =
  'group block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 sm:p-4';

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

type Props = {
  /** `listing`: two core guides for long-tail SEO footers. `full`: all configured guides. */
  variant?: 'listing' | 'full';
};

/**
 * Internal links to static resource guides — root-absolute hrefs only (next/link).
 */
export default function SeoAdditionalResourceGuidesLinks({
  variant = 'listing'
}: Props) {
  const slugs =
    variant === 'listing'
      ? LISTING_GUIDE_SLUGS
      : ([...RESOURCE_GUIDE_SLUGS] as (typeof RESOURCE_GUIDE_SLUGS)[number][]);

  return (
    <section
      className="space-y-3"
      aria-labelledby="seo-additional-resources-heading"
    >
      <h2
        id="seo-additional-resources-heading"
        className="text-lg font-bold tracking-tight text-slate-900 md:text-xl"
      >
        Helpful guides
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slugs.map((slug) => {
          const href = resourceGuideHref(slug);
          const { title, after } = LINK_COPY[slug];
          return (
            <Link key={slug} href={href} className={CARD_CLASS}>
              <p className="text-sm leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 transition group-hover:text-orange-700 group-hover:decoration-orange-400">
                  {title}
                </span>{' '}
                <span className="text-slate-600">{after}</span>
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
