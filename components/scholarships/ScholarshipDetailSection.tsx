import type { ReactNode } from 'react';

type ScholarshipDetailSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export default function ScholarshipDetailSection({
  title,
  children,
  className = ''
}: ScholarshipDetailSectionProps) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-base font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-100/50 md:p-6">
        {children}
      </div>
    </section>
  );
}
