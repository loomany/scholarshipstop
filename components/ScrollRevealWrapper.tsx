'use client';

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode
} from 'react';

type ScrollRevealWrapperProps = {
  children: ReactNode;
  className?: string;
  /** Class merged into the root element when the section enters the viewport. */
  visibleClassName?: string;
  /** Class merged into the root element while the section has not been revealed yet. */
  hiddenClassName?: string;
  threshold?: number;
  rootMargin?: string;
  as?: 'div' | 'section';
};

/**
 * Tiny client island that observes its own root with `IntersectionObserver` and
 * toggles `data-revealed="true"` + an optional class swap once the element enters view.
 *
 * Two supported usage patterns (no extra logic in children):
 * - Single-class mode: pass `visibleClassName` / `hiddenClassName`; the class set is applied to the root.
 * - Group-driven mode: add `group/<name>` to `className` and let nested static children style themselves
 *   via Tailwind variants such as `group-data-[revealed=true]/<name>:animate-...`.
 */
export default function ScrollRevealWrapper({
  children,
  className = '',
  visibleClassName = '',
  hiddenClassName = '',
  threshold = 0.12,
  rootMargin = '0px 0px -40px 0px',
  as = 'div'
}: ScrollRevealWrapperProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const Tag = as as ElementType;
  const merged = [className, visible ? visibleClassName : hiddenClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      ref={ref as never}
      className={merged}
      data-revealed={visible ? 'true' : undefined}
    >
      {children}
    </Tag>
  );
}
