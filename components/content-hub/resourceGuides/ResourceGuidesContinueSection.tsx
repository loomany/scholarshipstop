import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { resourceGuideContinueReadingForSlug } from '@/lib/content-hub/resourceGuidePages';

type Props = {
  currentSlug: string;
  heading?: string;
};

/**
 * Fixed scholarship guide links at end of editorial articles.
 */
export default function ResourceGuidesContinueSection({
  currentSlug,
  heading = 'Continue Reading'
}: Props) {
  const items = resourceGuideContinueReadingForSlug(currentSlug);
  if (items.length === 0) return null;

  return (
    <section
      className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5"
      aria-labelledby="resources-continue-reading-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Next useful guide
      </p>
      <h2
        id="resources-continue-reading-heading"
        className="mt-1 text-base font-semibold tracking-tight text-slate-950 sm:text-lg"
      >
        {heading}
      </h2>
      <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50/70 p-3 transition hover:border-orange-200 hover:bg-orange-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              <span className="flex items-start justify-between gap-3 text-sm font-semibold text-slate-900">
                {item.title}
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-orange-600"
                  aria-hidden
                />
              </span>
              <span className="mt-1 text-xs leading-5 text-slate-600">
                {item.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
