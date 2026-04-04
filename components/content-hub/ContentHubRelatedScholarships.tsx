import Link from 'next/link';
import clsx from 'clsx';

import type { ContentPostScholarshipLink } from '@/lib/content-hub/contentPostScholarshipLinks';

function contextLabel(
  reason: string,
  kind: ContentPostScholarshipLink['kind']
): string {
  if (kind === 'external') return 'External opportunity';
  const r = reason.trim();
  if (!r || /matched\s+by\s+intent|intent\s+match/i.test(r)) {
    return 'Recommended based on this article';
  }
  const lower = r.toLowerCase();
  if (lower.includes('international')) return 'Relevant for international students';
  if (lower.includes('graduate') || lower.includes('phd')) {
    return 'Good match for graduate applicants';
  }
  return 'May fit your goals';
}

const compactCardClass =
  'group flex h-full min-h-[8.5rem] flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2';

const featuredShellClass =
  'group flex w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6';

const featuredCtaClass =
  'inline-flex w-full shrink-0 items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition group-hover:bg-gray-800 sm:w-auto sm:px-7';

function ScholarshipLinkCardCompact({ item }: { item: ContentPostScholarshipLink }) {
  const label = contextLabel(item.reason, item.kind);
  const reasonSnippet =
    item.reason.trim() &&
    !/matched\s+by\s+intent|intent\s+match/i.test(item.reason)
      ? item.reason.trim()
      : '';

  const inner = (
    <>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-orange-600/90">
        {label}
      </p>
      <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800">
        {item.title}
      </h3>
      {reasonSnippet ? (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
          {reasonSnippet}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
        View scholarship →
      </span>
    </>
  );

  if (item.kind === 'external') {
    return (
      <a
        href={item.url}
        className={compactCardClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={`/scholarships/${encodeURIComponent(item.slug)}`}
      scroll
      className={compactCardClass}
    >
      {inner}
    </Link>
  );
}

function ScholarshipLinkCardFeatured({ item }: { item: ContentPostScholarshipLink }) {
  const label = contextLabel(item.reason, item.kind);
  const reasonSnippet =
    item.reason.trim() &&
    !/matched\s+by\s+intent|intent\s+match/i.test(item.reason)
      ? item.reason.trim()
      : '';

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-orange-600">
          {label}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-gray-900 sm:text-xl">
          {item.title}
        </h3>
        {reasonSnippet ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
            {reasonSnippet}
          </p>
        ) : null}
      </div>
      <span className={featuredCtaClass}>View scholarship</span>
    </>
  );

  if (item.kind === 'external') {
    return (
      <a
        href={item.url}
        className={featuredShellClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={`/scholarships/${encodeURIComponent(item.slug)}`}
      scroll
      className={featuredShellClass}
    >
      {body}
    </Link>
  );
}

type ContentHubRelatedScholarshipsProps = {
  links: ContentPostScholarshipLink[];
};

export default function ContentHubRelatedScholarships({
  links
}: ContentHubRelatedScholarshipsProps) {
  if (!links.length) return null;

  const count = links.length;
  const useFeatured = count < 3;

  return (
    <section
      className="mt-10"
      aria-labelledby="content-hub-related-scholarships-heading"
    >
      <h2
        id="content-hub-related-scholarships-heading"
        className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
      >
        🎓 Related Scholarships
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
        Based on this article, these scholarships may fit you
      </p>

      <div
        className={clsx(
          'mt-6 grid gap-4',
          count === 1 && 'grid-cols-1',
          count === 2 && 'grid-cols-1 md:grid-cols-2',
          count >= 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {links.map((item, index) =>
          useFeatured ? (
            <ScholarshipLinkCardFeatured
              key={
                item.kind === 'internal' ? item.slug : `${item.url}-${index}`
              }
              item={item}
            />
          ) : (
            <ScholarshipLinkCardCompact
              key={
                item.kind === 'internal' ? item.slug : `${item.url}-${index}`
              }
              item={item}
            />
          )
        )}
      </div>
    </section>
  );
}
