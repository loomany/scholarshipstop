import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/utils/cn';

type ShimmerBoxProps = ComponentPropsWithoutRef<'div'>;

/**
 * Skeleton block with a left-to-right shimmer (use inside `loading.tsx` or Suspense fallbacks).
 */
export function ShimmerBox({ className, ...props }: ShimmerBoxProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-zinc-200/90',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 animate-shimmer-wave bg-gradient-to-r from-transparent via-white/60 to-transparent"
        aria-hidden
      />
    </div>
  );
}
