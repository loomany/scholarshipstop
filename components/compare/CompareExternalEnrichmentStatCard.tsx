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
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100/60 sm:px-4 sm:py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums leading-tight text-gray-900 sm:text-lg">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
