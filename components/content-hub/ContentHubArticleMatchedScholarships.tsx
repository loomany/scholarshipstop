import Link from 'next/link';

import ContentHubArticleMatchedScholarshipSingle from '@/components/content-hub/ContentHubArticleMatchedScholarshipSingle';
import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';

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
      return d.toLocaleDateString(undefined, {
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
      return d.toLocaleDateString(undefined, {
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
  /** When there is exactly one related item, full catalog row for hub-style card. */
  detailScholarship?: Scholarship | null;
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
                  {item.award_amount_text}
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
  detailScholarship = null,
  sectionClassName = 'mt-4 sm:mt-5',
  heading = 'Related Scholarships',
  headingId = 'content-hub-matched-scholarships-heading',
  subheading = 'Real opportunities from our catalog, matched to this article.'
}: Props) {
  if (!items.length) return null;

  const useHubCard =
    items.length === 1 && detailScholarship != null;

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
        <Link
          href="/scholarships"
          className="font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
        >
          Browse the full scholarship catalog
        </Link>{' '}
        — filter by deadline, category, and more.
      </p>

      {useHubCard ? (
        <div className="mt-6">
          <ContentHubArticleMatchedScholarshipSingle
            scholarship={detailScholarship}
          />
        </div>
      ) : (
        <MatchedScholarshipGrid items={items} />
      )}
    </section>
  );
}
