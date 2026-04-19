import clsx from 'clsx';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';

const buttonClass =
  'inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-center text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-900 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)] active:scale-[0.99] sm:px-8 sm:py-3 sm:text-base';

export type ContentHubScholarshipCtaProps = {
  title: string;
  description: string;
  buttonText: string;
  className?: string;
};

export default function ContentHubScholarshipCta({
  title,
  description,
  buttonText,
  className
}: ContentHubScholarshipCtaProps) {
  return (
    <aside
      className={clsx(
        'flex w-full flex-col items-center text-center rounded-2xl border border-gray-200/90 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 px-4 py-3 ring-1 ring-gray-100 sm:px-5 sm:py-3.5',
        className
      )}
      aria-label="Scholarship directory"
    >
      <h2 className="w-full text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
        {title}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-snug text-gray-600 sm:text-[0.9375rem] sm:leading-relaxed">
        {description}
      </p>
      <div className="mt-3 flex w-full justify-center sm:mt-3.5">
        <ScholarshipCatalogEntryLink className={buttonClass}>
          {buttonText}
        </ScholarshipCatalogEntryLink>
      </div>
    </aside>
  );
}
