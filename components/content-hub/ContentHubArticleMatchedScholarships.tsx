import Link from 'next/link';

import ContentHubArticleMatchedScholarshipCards from '@/components/content-hub/ContentHubArticleMatchedScholarshipCards';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';
import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import {
  formatScholarshipAwardDisplay,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';

const cardClass =
  'group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2';

/** Normalize catalog deadline lines (ISO timestamps, plain dates) for card meta. */
function formatDeadlineDisplay(raw: string | null | undefined): string {
  const s = raw?.trim();
  if (!s) return '';
  // ISO 8601 with time (any position in string)
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    }
  }
  // Plain YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    }
  }
  return s;
}

type Props = {
  items: RelatedScholarshipStored[];
  /** Full catalog rows (listing card) for hub-style cards; order follows items. */
  hubScholarships?: Scholarship[] | null;
  /** Insert the IQ assessment promo after the first rendered card. */
  showIqAdAfterFirst?: boolean;
  /** Section root classes. */
  sectionClassName?: string;
  /** Visible `<h2>` text. */
  heading?: string;
  /** `id` on the heading (also used for `aria-labelledby` on the section). */
  headingId?: string;
  /** Line under the heading; omit when `null`. */
  subheading?: string | null;
};

function MatchedScholarshipGrid({ items }: { items: RelatedScholarshipStored[] }) {
  /* Block + space-y avoids any flex-row overrides from parent/CDN; one card per row. */
  return (
    <ul className="mt-6 list-none space-y-4">
      {items.map((item) => (
        <li key={item.slug} className="block min-w-0 w-full">
          <Link
            href={`/scholarships/${encodeURIComponent(item.slug)}`}
            scroll
            className={cardClass}
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-orange-600/90">
              {item.reason}
            </p>
            <h3 className="mt-2 line-clamp-3 text-base font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800">
              {item.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
              {item.award_amount_text ? (
                <span className="font-semibold text-gray-900">
                  {formatScholarshipAwardDisplay(item.award_amount_text, 'en')}
                </span>
              ) : null}
              {item.deadline_text ? (
                <span className="text-gray-500">
                  {formatDeadlineDisplay(item.deadline_text)}
                </span>
              ) : null}
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
              View scholarship →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ContentHubArticleMatchedScholarships({
  items,
  hubScholarships = null,
  showIqAdAfterFirst = false,
  sectionClassName = 'mt-4 sm:mt-5',
  heading = 'Related Scholarships',
  headingId = 'content-hub-matched-scholarships-heading',
  subheading = 'Real opportunities from our catalog, matched to this article.'
}: Props) {
  if (!items.length) return null;

  const useHubCards = hubScholarships != null && hubScholarships.length > 0;

  return (
    <section
      className={sectionClassName}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
      >
        {heading}
      </h2>
      {subheading ? (
        <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
          {subheading}
        </p>
      ) : null}

      <p
        className={`text-left text-sm text-gray-600 ${subheading ? 'mt-4' : 'mt-3'}`}
      >
        <ScholarshipCatalogEntryLink
          className="font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
        >
          Browse the full scholarship catalog
        </ScholarshipCatalogEntryLink>{' '}
        — filter by deadline, category, and more.
      </p>

      {useHubCards ? (
        <ContentHubArticleMatchedScholarshipCards
          scholarships={hubScholarships}
          showIqAdAfterFirst={showIqAdAfterFirst}
        />
      ) : (
        <MatchedScholarshipGrid items={items} />
      )}
    </section>
  );
}
