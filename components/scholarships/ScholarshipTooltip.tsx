'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';

type Placement = 'bottom' | 'top';

type ScholarshipTooltipProps = {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  className?: string;
  maxWidthClass?: string;
  /** When false, no tab stop (e.g. trigger inside a link); hover-only tooltip. */
  keyboard?: boolean;
};

function isNativeButton(el: ReactElement): boolean {
  return typeof el.type === 'string' && el.type === 'button';
}

function mergeDescribedBy(
  prev: string | undefined,
  tooltipId: string
): string {
  if (!prev?.trim()) return tooltipId;
  if (prev.includes(tooltipId)) return prev;
  return `${prev} ${tooltipId}`;
}

/**
 * Dark bubble + caret toward trigger, hover and focus-within.
 */
export default function ScholarshipTooltip({
  content,
  children,
  placement = 'bottom',
  className = '',
  maxWidthClass = 'max-w-[min(280px,calc(100vw-32px))]',
  keyboard = true
}: ScholarshipTooltipProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);

  const only = Children.only(children) as ReactElement;

  const trigger = isNativeButton(only) ? (
    cloneElement(only, {
      'aria-describedby': mergeDescribedBy(
        only.props['aria-describedby'] as string | undefined,
        tooltipId
      )
    })
  ) : keyboard ? (
    <span
      tabIndex={0}
      aria-describedby={tooltipId}
      className="inline-flex max-w-full cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 focus-visible:ring-offset-1"
    >
      {only}
    </span>
  ) : (
    <span className="inline-flex max-w-full cursor-default rounded-sm">
      {only}
    </span>
  );

  const clampToViewport = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;
    const pad = 10;
    const r = panel.getBoundingClientRect();
    let dx = 0;
    if (r.left < pad) dx = pad - r.left;
    if (r.right > window.innerWidth - pad) {
      dx -= r.right - (window.innerWidth - pad);
    }
    setShiftX(dx);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onEnter = () => {
      requestAnimationFrame(() => clampToViewport());
    };

    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('focusin', onEnter);
    window.addEventListener('scroll', clampToViewport, true);
    window.addEventListener('resize', clampToViewport);

    return () => {
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('focusin', onEnter);
      window.removeEventListener('scroll', clampToViewport, true);
      window.removeEventListener('resize', clampToViewport);
    };
  }, [clampToViewport]);

  const isBottom = placement === 'bottom';

  return (
    <div
      ref={rootRef}
      className={`group/tip relative inline-flex max-w-full align-middle ${className}`}
    >
      {trigger}
      <div
        ref={panelRef}
        id={tooltipId}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
        className={`pointer-events-none invisible absolute left-1/2 z-[200] ${maxWidthClass} w-max opacity-0 transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 ${
          isBottom ? 'top-full mt-2' : 'bottom-full mb-2'
        } `}
      >
        <div className="flex flex-col items-center">
          {isBottom ? (
            <>
              <div
                className="h-0 w-0 border-x-[7px] border-b-[8px] border-x-transparent border-b-[#222222]"
                aria-hidden
              />
              <div className="-mt-px rounded-lg bg-[#222222] px-3.5 py-2.5 text-left text-sm font-medium leading-snug text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] ring-1 ring-black/10">
                {content}
              </div>
            </>
          ) : (
            <>
              <div className="-mb-px rounded-lg bg-[#222222] px-3.5 py-2.5 text-left text-sm font-medium leading-snug text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] ring-1 ring-black/10">
                {content}
              </div>
              <div
                className="h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-[#222222]"
                aria-hidden
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
