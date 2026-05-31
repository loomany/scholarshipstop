type InsightCalloutProps = {
  title: string;
  body: string;
  className?: string;
};

export function InsightCallout({ title, body, className = '' }: InsightCalloutProps) {
  return (
    <aside
      className={`rounded-xl border border-orange-200/80 bg-orange-50/60 px-4 py-3 ${className}`.trim()}
      aria-label={title}
    >
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{body}</p>
    </aside>
  );
}
