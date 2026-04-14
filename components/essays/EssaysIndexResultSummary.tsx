import clsx from 'clsx';

type EssaysIndexResultSummaryProps = {
  resultCount: number;
  showingFrom: number;
  showingTo: number;
  className?: string;
};

export function EssaysIndexResultSummary({
  resultCount,
  showingFrom,
  showingTo,
  className
}: EssaysIndexResultSummaryProps) {
  if (resultCount <= 0) return null;
  return (
    <p
      className={clsx('text-sm text-gray-500', className)}
    >
      {showingFrom >= 1 && showingTo >= showingFrom
        ? `Showing ${showingFrom}–${showingTo} of ${resultCount} guides`
        : `Found ${resultCount} guides`}
    </p>
  );
}
