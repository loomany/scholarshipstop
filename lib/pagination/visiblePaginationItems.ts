/** One row everywhere; horizontal scroll when page chips overflow (never wrap “Next”). */
export const paginationControlsRowClassName =
  'flex max-w-full min-w-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-0.5 sm:gap-2 sm:pb-0';

/**
 * When total pages exceed this, omit a dedicated “last page” chip from the numeric list.
 * Deep pages (e.g. `?page=2017`) stay reachable via sequential Next. Keeps SSR lean for crawlers.
 */
export const MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP = 100;

/**
 * Page index chips for pagination UIs. Above `maxFullList`, uses ellipses so
 * narrow viewports keep Previous / numbers / Next on one row.
 */
export function visiblePaginationItems(
  current: number,
  total: number,
  maxFullList = 5
): (number | 'ellipsis')[] {
  if (total <= maxFullList) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const set = new Set<number>();
  set.add(1);
  if (total <= MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP) {
    set.add(total);
  }
  for (let i = current - delta; i <= current + delta; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
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

const DESKTOP_FIRST_BLOCK = 10;

/**
 * Desktop: always include pages `1 … DESKTOP_FIRST_BLOCK`, optionally the last page (when
 * `total` ≤ {@link MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP}), and a ±1 window around
 * `current`. Gaps collapse to `ellipsis`.
 * Example (`total` ≤ 100, `current` 1): `1–10 … total`. When `total` > 100, the standalone last chip is omitted.
 */
export function visiblePaginationItemsDesktop(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= DESKTOP_FIRST_BLOCK) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  for (let p = 1; p <= DESKTOP_FIRST_BLOCK; p++) {
    set.add(p);
  }
  if (total <= MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP) {
    set.add(total);
  }
  set.add(current);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) {
      set.add(p);
    }
  }

  const sorted = Array.from(set).sort((a, b) => a - b);
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
