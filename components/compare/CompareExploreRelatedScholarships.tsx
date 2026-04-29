import Link from 'next/link';

import {
  HUB_INTERNATIONAL_SEGMENT,
  tabToHubPath
} from '@/app/scholarships/scholarshipHubPath';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import {
  ESSAYS_PAGE_TITLE,
  ESSAYS_SECTION_PATH
} from '@/lib/essays/essayHubSection';

const hubExploreLinks = [
  {
    href: tabToHubPath('matches'),
    label: 'Recommended matches browsing'
  },
  {
    href: tabToHubPath(HUB_INTERNATIONAL_SEGMENT),
    label: 'International-friendly spotlight'
  },
  {
    href: tabToHubPath('easy-apply'),
    label: 'Easier applications & streamlined forms'
  }
] as const;

/**
 * Structured cross-links from compare detail pages into product hubs and editorial zones.
 */
export default function CompareExploreRelatedScholarships() {
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
        Explore related scholarships
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
        Continue from this comparison into ScholarshipTop hubs tuned for discovery speed, visas,
        and lighter-touch applications—then deepen planning with evergreen essays and resource
        articles when you need narrative or policy context.
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
          href={ESSAYS_SECTION_PATH}
          className="inline-flex items-center gap-2 text-base font-semibold text-indigo-800 underline decoration-indigo-400/55 underline-offset-4 transition hover:text-indigo-950 hover:decoration-indigo-700"
        >
          {ESSAYS_PAGE_TITLE}
        </Link>
        <Link
          href={RESOURCES_SECTION_PATH}
          className="inline-flex items-center gap-2 text-base font-semibold text-emerald-800 underline decoration-emerald-400/55 underline-offset-4 transition hover:text-emerald-950 hover:decoration-emerald-700"
        >
          {RESOURCES_PAGE_TITLE}
        </Link>
      </div>
    </section>
  );
}
