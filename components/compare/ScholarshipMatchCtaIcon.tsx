import { Target } from 'lucide-react';

/** Target icon for compare/provider scholarship-match CTAs (replaces emoji for cross-platform fonts). */
export default function ScholarshipMatchCtaIcon() {
  return (
    <Target
      className="h-7 w-7 shrink-0 text-rose-500 sm:h-8 sm:w-8"
      aria-hidden
      strokeWidth={2}
    />
  );
}
