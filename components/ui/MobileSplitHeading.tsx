import type { ElementType, ReactNode } from 'react';

import { cn } from '@/utils/cn';

type MobileSplitHeadingProps<T extends ElementType = 'h2'> = {
  as?: T;
  id?: string;
  className?: string;
  /** Shown on the first row below the `sm` breakpoint; flows inline from `sm` up. */
  firstOnMobile: ReactNode;
  /** Shown on the second row below `sm`; flows inline from `sm` up. */
  secondOnMobile: ReactNode;
};

/**
 * Long headings: on viewports below `sm`, stack two parts on separate lines; from `sm` up, one line.
 */
export default function MobileSplitHeading<T extends ElementType = 'h2'>({
  as,
  id,
  className,
  firstOnMobile,
  secondOnMobile
}: MobileSplitHeadingProps<T>) {
  const Tag = (as ?? 'h2') as ElementType;
  return (
    <Tag id={id} className={cn('text-pretty', className)}>
      <span className="max-sm:block sm:inline">{firstOnMobile}</span>
      <span className="max-sm:block sm:inline">{secondOnMobile}</span>
    </Tag>
  );
}
