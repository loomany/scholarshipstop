type ScholarshipMetaBoxProps = {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
};

export default function ScholarshipMetaBox({
  label,
  value,
  className = '',
  valueClassName = ''
}: ScholarshipMetaBoxProps) {
  return (
    <div
      className={`rounded-xl border border-gray-700 bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3 ${className}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-medium text-zinc-900 md:text-base ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}
