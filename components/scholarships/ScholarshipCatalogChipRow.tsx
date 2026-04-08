'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { CardChip } from '@/lib/scholarships/scholarshipCatalog';

const CHIP_CLASS =
  'shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200/80';

const MORE_CLASS = 'shrink-0 text-[10px] font-semibold text-gray-500';

/** Tailwind `gap-2` between chips */
const GAP_PX = 8;

function measureMoreLabelWidth(count: number): number {
  if (count <= 0) return 0;
  const span = document.createElement('span');
  span.className = MORE_CLASS;
  span.textContent = `+${count} more`;
  span.style.position = 'absolute';
  span.style.visibility = 'hidden';
  span.style.whiteSpace = 'nowrap';
  document.body.appendChild(span);
  const w = span.offsetWidth;
  document.body.removeChild(span);
  return w;
}

/**
 * Single-row chip list: show as many labels as fit; overflow becomes "+N more".
 */
export default function ScholarshipCatalogChipRow({ chips }: { chips: CardChip[] }) {
  const chipsRef = useRef(chips);
  chipsRef.current = chips;

  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => chips.length);

  const chipKey = chips.map((c) => c.key).join('|');

  const recompute = useCallback(() => {
    const list = chipsRef.current;
    const outer = outerRef.current;
    const measureRow = measureRef.current;
    if (!list.length) {
      setVisible(0);
      return;
    }
    if (!outer || !measureRow) {
      setVisible(list.length);
      return;
    }

    const maxW = outer.clientWidth;
    if (maxW <= 0) {
      setVisible(list.length);
      return;
    }

    const chipEls = measureRow.querySelectorAll<HTMLElement>('[data-chip-measure]');
    const widths = Array.from(chipEls).map((el) => el.offsetWidth);

    const moreCache = new Map<number, number>();
    const moreW = (n: number) => {
      if (n <= 0) return 0;
      let w = moreCache.get(n);
      if (w == null) {
        w = measureMoreLabelWidth(n);
        moreCache.set(n, w);
      }
      return w;
    };

    let best = 0;
    let cumulative = 0;

    for (let i = 0; i < list.length; i++) {
      const chipW = widths[i] ?? 0;
      const shownAfter = i + 1;
      const remaining = list.length - shownAfter;
      const nextCumulative = cumulative + (i > 0 ? GAP_PX : 0) + chipW;
      const totalNeed =
        nextCumulative + (remaining > 0 ? GAP_PX + moreW(remaining) : 0);
      if (totalNeed <= maxW) {
        best = shownAfter;
        cumulative = nextCumulative;
      } else {
        break;
      }
    }

    setVisible(Math.max(best, list.length > 0 ? 1 : 0));
  }, []);

  useLayoutEffect(() => {
    recompute();
  }, [chipKey, recompute]);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(outer);
    return () => ro.disconnect();
  }, [recompute]);

  if (chips.length === 0) return null;

  const overflow = Math.max(0, chips.length - visible);

  return (
    <div className="relative min-w-0">
      <div
        ref={measureRef}
        className="invisible absolute left-0 top-0 z-0 flex w-max flex-nowrap gap-2"
        aria-hidden
      >
        {chips.map((c) => (
          <span key={c.key} data-chip-measure className={CHIP_CLASS}>
            {c.label}
          </span>
        ))}
      </div>
      <div
        ref={outerRef}
        className="flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden"
      >
        {chips.slice(0, visible).map((c) => (
          <span key={c.key} className={CHIP_CLASS}>
            {c.label}
          </span>
        ))}
        {overflow > 0 ? (
          <span className={MORE_CLASS}>+{overflow} more</span>
        ) : null}
      </div>
    </div>
  );
}
