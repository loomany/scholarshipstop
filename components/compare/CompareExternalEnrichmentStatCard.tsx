type CompareExternalEnrichmentStatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function CompareExternalEnrichmentStatCard({
  label,
  value,
  hint
}: CompareExternalEnrichmentStatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums leading-tight text-gray-900 sm:text-lg">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
