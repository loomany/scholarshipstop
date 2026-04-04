'use client';

import { useEffect, useState } from 'react';

type ContentPostCardPublishedAtProps = {
  publishedAt: string | null;
  /** `card` = resources grid (uppercase label). `article` = article header. */
  variant?: 'card' | 'article';
};

/**
 * Card date line: same visible date as before; hover `title` shows full local
 * date/time in the visitor's timezone (set on client after mount).
 */
export function ContentPostCardPublishedAt({
  publishedAt,
  variant = 'card'
}: ContentPostCardPublishedAtProps) {
  const [localTooltip, setLocalTooltip] = useState('');

  const cardClass =
    'cursor-help text-xs font-medium uppercase tracking-wide text-gray-400';
  const articleClass = 'cursor-help text-sm text-gray-600';
  const timeClassName = variant === 'article' ? articleClass : cardClass;

  useEffect(() => {
    if (!publishedAt?.trim()) {
      setLocalTooltip('');
      return;
    }
    const d = new Date(publishedAt);
    if (Number.isNaN(d.getTime())) {
      setLocalTooltip('');
      return;
    }
    setLocalTooltip(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }).format(d)
    );
  }, [publishedAt]);

  if (!publishedAt?.trim()) {
    return (
      <span
        className={
          variant === 'article'
            ? 'text-sm text-gray-600'
            : 'text-xs font-medium uppercase tracking-wide text-gray-400'
        }
      >
        —
      </span>
    );
  }

  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) {
    return (
      <span
        className={
          variant === 'article'
            ? 'text-sm text-gray-600'
            : 'text-xs font-medium uppercase tracking-wide text-gray-400'
        }
      >
        {publishedAt}
      </span>
    );
  }

  const display = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(d);

  return (
    <time
      className={timeClassName}
      dateTime={publishedAt}
      title={localTooltip || undefined}
    >
      {display}
    </time>
  );
}
