import clsx from 'clsx';

import type { EssayTocItem } from '@/lib/essays/essayBodyToc';

/** Matches `EssayTableOfContents` on `/essays/[slug]` — anchor list for comparison body HTML */
export default function CompareTableOfContents({
  items,
  labelId = 'compare-toc-label',
  onThisPageLabel = 'On this page',
  className
}: {
  items: EssayTocItem[];
  labelId?: string;
  onThisPageLabel?: string;
  /** Extra classes on `<nav>` (e.g. layout inside a bordered section). */
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      className={clsx(
        'mt-8 rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5',
        className
      )}
      aria-labelledby={labelId}
    >
      <p
        id={labelId}
        className="text-sm font-semibold tracking-tight text-gray-900"
      >
        {onThisPageLabel}
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
