'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/utils/cn';

export function DarkTooltipProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      {children}
    </Tooltip.Provider>
  );
}

type Side = 'top' | 'right' | 'bottom' | 'left';

export function DarkTooltip({
  content,
  children,
  side = 'bottom',
  align = 'center',
  className,
  contentClassName
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: Side;
  align?: 'start' | 'center' | 'end';
  /** Wrapper classes (e.g. absolute corner placement). */
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn('inline-flex', className)}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              'z-[200] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg bg-zinc-900 px-3 py-2.5 text-xs font-semibold leading-snug text-white shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              contentClassName
            )}
          >
            {content}
            <Tooltip.Arrow className="fill-zinc-900" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  );
}
