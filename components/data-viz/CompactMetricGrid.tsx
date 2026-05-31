type CompactMetricItem = {
  key: string;
  label: string;
  value: string | null;
  hint?: string;
};

type CompactMetricGridProps = {
  items: CompactMetricItem[];
  columns?: 2 | 3;
  className?: string;
};

export function CompactMetricGrid({
  items,
  columns = 2,
  className = ''
}: CompactMetricGridProps) {
  const visible = items.filter((item) => item.value?.trim());
  if (!visible.length) return null;

  const colClass =
    columns === 3 ?
      'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-2';

  return (
    <dl className={`grid gap-2.5 ${colClass} ${className}`.trim()}>
      {visible.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
            {item.value}
          </dd>
          {item.hint ? (
            <dd className="mt-0.5 text-[11px] text-gray-500">{item.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
