/** Single-row on small screens; optional horizontal scroll if needed. */
export const paginationControlsRowClassName =
  'flex max-w-full flex-nowrap items-center justify-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-0.5 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:pb-0';

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
  set.add(total);
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
 * Desktop: always include pages `1 … DESKTOP_FIRST_BLOCK`, the last page, and a ±1 window
 * around `current` so middle pages stay reachable. Gaps collapse to `ellipsis`.
 * Example (total 380, current 1): `1–10 … 380`.
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
  set.add(total);
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
