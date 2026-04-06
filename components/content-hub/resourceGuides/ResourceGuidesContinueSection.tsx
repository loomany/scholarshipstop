import Link from 'next/link';

import {
  resourceGuideContinueReadingForSlug,
  resourceGuideLinkClassName
} from '@/lib/content-hub/resourceGuidePages';

type Props = {
  currentSlug: string;
};

/**
 * Fixed scholarship guide links at end of editorial articles (not random DB posts).
 */
export default function ResourceGuidesContinueSection({ currentSlug }: Props) {
  const items = resourceGuideContinueReadingForSlug(currentSlug);
  if (items.length === 0) return null;

  return (
    <section
      className="mt-4 rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:mt-5 sm:p-5"
      aria-labelledby="resources-continue-reading-heading"
    >
      <h2
        id="resources-continue-reading-heading"
        className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg"
      >
        Continue Reading
      </h2>
      <ul className="mt-3 list-none space-y-2.5 p-0 sm:space-y-3">
        {items.map((item) => (
          <li key={item.href} className="text-sm leading-relaxed text-gray-600 sm:text-base">
            <Link href={item.href} className={resourceGuideLinkClassName}>
              {item.title}
            </Link>
            <span> — {item.blurb}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
