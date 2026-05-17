/** One row everywhere; horizontal scroll when page chips overflow (never wrap “Next”). */
export const paginationControlsRowClassName =
  'flex max-w-full min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-0.5 sm:gap-2 sm:pb-0';

/** Mobile: always show the first N page chips, then ellipsis, then the last page. */
const MOBILE_LEADING_BLOCK = 4;

function collapsePageNumbersWithEllipsis(
  sorted: number[]
): (number | 'ellipsis')[] {
  const out: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      out.push('ellipsis');
    }
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Mobile/narrow pagination: `1 … 4 … last` so users see scale (e.g. page 2158).
 * When `current` is past the leading block, also shows `current ± 1`.
 */
export function visiblePaginationItems(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 1) {
    return [1];
  }
  if (total <= MOBILE_LEADING_BLOCK + 1) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  for (let p = 1; p <= MOBILE_LEADING_BLOCK; p++) {
    set.add(p);
  }
  set.add(total);

  if (current > MOBILE_LEADING_BLOCK && current < total) {
    set.add(current);
    if (current > 1) set.add(current - 1);
    if (current < total) set.add(current + 1);
  }

  return collapsePageNumbersWithEllipsis(
    Array.from(set).sort((a, b) => a - b)
  );
}

/** Desktop: first N page chips, then ellipsis, then the last page (e.g. `1–6 … 2158`). */
const DESKTOP_LEADING_BLOCK = 6;

/**
 * Desktop: `1 … 6 … last` at the start; when `current` is past the leading block, also
 * `current ± 1`. Gaps collapse to `ellipsis`.
 */
export function visiblePaginationItemsDesktop(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 1) {
    return [1];
  }
  if (total <= DESKTOP_LEADING_BLOCK) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  for (let p = 1; p <= DESKTOP_LEADING_BLOCK; p++) {
    set.add(p);
  }
  set.add(total);

  if (current > DESKTOP_LEADING_BLOCK && current < total) {
    set.add(current);
    if (current > 1) set.add(current - 1);
    if (current < total) set.add(current + 1);
  }

  return collapsePageNumbersWithEllipsis(
    Array.from(set).sort((a, b) => a - b)
  );
}
