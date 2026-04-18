import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import { cn } from '@/utils/cn';

type SiteBrandLoadingProps = {
  /**
   * Caption under the mark.
   * Omit for default “Loading scholarships…”; pass `''` to hide text (logo only).
   */
  label?: string;
  /** Applied to the inner loader (min-height, padding, etc.). */
  className?: string;
  /** Root wrapper (e.g. `bg-[#F3F7FA] min-h-screen` for hub templates). */
  outerClassName?: string;
};

/**
 * Full-viewport brand loading: orange top accent + pulsing cap (see `ScholarshipsBrandLoading`).
 * Use for route Suspense fallbacks and any plain “Loading…” full-page states.
 */
export function SiteBrandLoading({
  label,
  className,
  outerClassName
}: SiteBrandLoadingProps) {
  const resolvedLabel = label === undefined ? 'Loading scholarships…' : label;
  return (
    <div className={cn('w-full bg-zinc-50', outerClassName)}>
      <ScholarshipsBrandLoading
        label={resolvedLabel}
        density="comfortable"
        showTopAccentBar
        className={cn('min-h-[calc(100dvh-4rem)]', className)}
      />
    </div>
  );
}
