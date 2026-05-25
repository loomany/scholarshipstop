import Link from 'next/link';

import { HUB_INTERNATIONAL_SEGMENT } from '@/app/scholarships/scholarshipHubPath';
import { getCompareStateDetailUiCopy } from '@/lib/i18n/compareStateDetailUiCopy';
import {
  hrefForLocalizedUiRequired,
  localizedScholarshipHubTabHref,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

type CompareExploreRelatedScholarshipsProps = {
  locale?: LocalizedUiLocale;
};

/**
 * Structured cross-links from compare detail pages into product hubs and editorial zones.
 */
export default function CompareExploreRelatedScholarships({
  locale = 'en'
}: CompareExploreRelatedScholarshipsProps) {
  const ui = getCompareStateDetailUiCopy(locale);
  const hubExploreLinks = [
    {
      href: localizedScholarshipHubTabHref(locale, 'matches'),
      label: ui.exploreMatches
    },
    {
      href: localizedScholarshipHubTabHref(locale, HUB_INTERNATIONAL_SEGMENT),
      label: ui.exploreInternational
    },
    {
      href: localizedScholarshipHubTabHref(locale, 'easy-apply'),
      label: ui.exploreEasyApply
    }
  ] as const;
  const resourcesHref = hrefForLocalizedUiRequired(locale, '/resources');

  return (
    <section
      id="compare-explore-related-scholarships"
      aria-labelledby="compare-explore-hub-heading"
      className="mt-10 scroll-mt-28 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white p-6 shadow-sm sm:p-8 sm:scroll-mt-24"
    >
      <h2
        id="compare-explore-hub-heading"
        className="text-xl font-bold tracking-tight text-gray-900"
      >
        {ui.exploreHeading}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
        {ui.exploreIntro}
      </p>
      <ul className="mt-5 space-y-3 text-sm leading-relaxed sm:text-base">
        {hubExploreLinks.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="font-semibold text-sky-800 underline decoration-sky-400/55 underline-offset-4 transition hover:text-sky-950 hover:decoration-sky-700"
            >
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href={hrefForLocalizedUiRequired(locale, '/essays')}
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-800 underline decoration-indigo-400/55 underline-offset-4 transition hover:text-indigo-950 hover:decoration-indigo-700"
        >
          {ui.exploreEssaysLink}
        </Link>
        <Link
          href={resourcesHref}
          className="inline-flex items-center gap-2 text-base font-semibold text-emerald-800 underline decoration-emerald-400/55 underline-offset-4 transition hover:text-emerald-950 hover:decoration-emerald-700"
        >
          {ui.exploreResourcesLink}
        </Link>
      </div>
    </section>
  );
}
