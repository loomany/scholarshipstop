import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export type FeaturedBrandScholarship = {
  brandName: string;
  /** Domain for Unavatar logo URL: https://unavatar.io/[domain] */
  brandDomain: string;
  title: string;
  description: string;
  amount: string;
  href: string;
};

/** Mock data — replace with API / DB when ready */
export const FEATURED_BRAND_SCHOLARSHIPS_MOCK: FeaturedBrandScholarship[] = [
  {
    brandName: 'AMD',
    brandDomain: 'amd.com',
    title: 'AMD Gary Heerssen Memorial Scholarship',
    description:
      'Merit-based memorial award for students in technical fields, honoring Gary Heerssen’s legacy at partner colleges.',
    amount: '$5,000',
    href: '/scholarships/amd-gary-heerssen-memorial-scholarship-lfljjxvijicw'
  },
  {
    brandName: 'Google',
    brandDomain: 'google.com',
    title: 'Google Generation Scholarship',
    description:
      'Supports students pursuing computer science and related degrees with strong academics and leadership in tech.',
    amount: '$10,000',
    href: '/scholarships/generation-google-scholarship-nb3augz7pi07'
  },
  {
    brandName: 'Microsoft',
    brandDomain: 'microsoft.com',
    title: 'Microsoft Tuition Scholarship',
    description:
      'Financial support for undergraduates in STEM, with emphasis on inclusion and pathways into technology careers.',
    amount: 'Full Tuition',
    href: '/scholarships'
  }
];

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

type FeaturedBrandScholarshipsSectionProps = {
  className?: string;
  items?: FeaturedBrandScholarship[];
};

export function FeaturedBrandScholarshipsSection({
  className,
  items = FEATURED_BRAND_SCHOLARSHIPS_MOCK
}: FeaturedBrandScholarshipsSectionProps) {
  return (
    <section
      role="region"
      aria-labelledby="featured-brand-scholarships-heading"
      className={clsx(className)}
    >
      <div className="mx-auto max-w-7xl text-center">
        <h2 id="featured-brand-scholarships-heading" className={`text-pretty ${h2Class}`}>
          Featured Opportunities from Global Brands
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
          Apply to top-tier programs sponsored by industry leaders.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:grid-cols-3 md:gap-8">
        {items.map((item) => {
          const logoSrc = `https://unavatar.io/${item.brandDomain}`;
          return (
            <li key={item.title} className="h-full">
              <article className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Unavatar external logos */}
                    <img
                      src={logoSrc}
                      alt={`${item.brandName} logo`}
                      width={48}
                      height={48}
                      className="h-12 w-12 bg-white object-contain p-1.5"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">
                    Premium
                  </span>
                </div>

                <h3 className="mt-5 text-left text-lg font-bold leading-snug tracking-tight text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-left text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {item.description}
                </p>

                <div className="mt-auto pt-6">
                  <p className="text-left text-lg font-bold tabular-nums text-gray-900">
                    {item.amount}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 transition-all duration-200 hover:gap-2 hover:text-blue-600"
                  >
                    View Details -&gt;
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
