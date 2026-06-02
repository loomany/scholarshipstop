type InsightCalloutProps = {
  title: string;
  body: string;
  className?: string;
};

export function InsightCallout({
  title,
  body,
  className = ''
}: InsightCalloutProps) {
  return (
    <aside
      className={`rounded-xl border border-orange-200/80 bg-white px-4 py-3 shadow-sm ring-1 ring-orange-100/70 ${className}`.trim()}
      aria-label={title}
    >
      <h3 className="text-sm font-semibold text-orange-950">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{body}</p>
    </aside>
  );
}
