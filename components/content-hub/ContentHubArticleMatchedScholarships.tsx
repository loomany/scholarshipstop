import Link from 'next/link';

import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';

const cardClass =
  'group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2';

type Props = {
  items: RelatedScholarshipStored[];
};

export default function ContentHubArticleMatchedScholarships({ items }: Props) {
  if (!items.length) return null;

  return (
    <section
      className="mt-4 sm:mt-5"
      aria-labelledby="content-hub-matched-scholarships-heading"
    >
      <h2
        id="content-hub-matched-scholarships-heading"
        className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
      >
        Related Scholarships
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
        Real opportunities from our catalog, matched to this article.
      </p>
      <ul className="mt-6 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.slug} className="min-w-0">
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
                  <span className="text-gray-500">{item.deadline_text}</span>
                ) : null}
              </div>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                View scholarship →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
