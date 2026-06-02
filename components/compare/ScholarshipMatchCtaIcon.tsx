import { Target } from 'lucide-react';

/** Target icon for compare/provider scholarship-match CTAs (replaces emoji for cross-platform fonts). */
export default function ScholarshipMatchCtaIcon({
  className = 'h-7 w-7 sm:h-8 sm:w-8'
}: {
  className?: string;
}) {
  return (
    <Target
      className={`shrink-0 text-rose-500 ${className}`.trim()}
      aria-hidden
      strokeWidth={2}
    />
  );
}
