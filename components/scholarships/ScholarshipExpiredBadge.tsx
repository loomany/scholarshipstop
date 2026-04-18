'use client';

import { cn } from '@/utils/cn';

/** Brand orange pill — use wherever a listing’s application deadline has passed. */
const expiredBadgeClass =
  'pointer-events-none inline-flex shrink-0 items-center rounded-md bg-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm';

export function ScholarshipExpiredBadge({
  className,
  id
}: {
  className?: string;
  id?: string;
}) {
  return (
    <span
      id={id}
      className={cn(expiredBadgeClass, className)}
      aria-label="Application deadline has passed"
    >
      EXPIRED
    </span>
  );
}
