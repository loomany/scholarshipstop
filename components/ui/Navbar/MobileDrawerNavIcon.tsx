import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  active?: boolean;
};

/** Rounded “SaaS” icon tile for the mobile drawer nav rows. */
export default function MobileDrawerNavIcon({ icon: Icon, active }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-inset ring-white/[0.08]',
        active ? 'text-orange-300' : 'text-orange-400/90'
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}
