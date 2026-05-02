'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Globe2 } from 'lucide-react';

import type {
  HomeScholarshipCatalogStats,
  ScholarshipListMeta
} from '@/lib/scholarships/scholarshipListServer';

const container = 'mx-auto w-full max-w-7xl';

const emeraldCtaClass =
  'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_10px_36px_-10px_rgba(16,185,129,0.45)] transition duration-200 ease-out hover:bg-emerald-600 hover:shadow-[0_14px_40px_-10px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] sm:w-auto sm:min-w-[240px] sm:py-[1.125rem] sm:text-xl';

export type HomeInternationalGrantsCountryRow = ScholarshipListMeta['countryCounts'][number];

const UNITED_STATES_FALLBACK: HomeInternationalGrantsCountryRow = {
  code: 'US',
  label: 'United States',
  count: 1473
};

const DESTINATION_PRIORITY = ['US', 'GB', 'CA', 'CN', 'ES'] as const;
const MIN_DESTINATION_LISTINGS = 40;
const MAX_DESTINATIONS = 16;

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatUsdCompact(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B+`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M+`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K+`;
  return `$${formatInteger(value)}+`;
}

function flagCdnUrl(code: string) {
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
}

function buildDestinationCountries(
  countries: HomeInternationalGrantsCountryRow[]
): HomeInternationalGrantsCountryRow[] {
  const byCode = new Map(countries.map((country) => [country.code.toUpperCase(), country]));
  const out: HomeInternationalGrantsCountryRow[] = [];
  const used = new Set<string>();

  for (const code of DESTINATION_PRIORITY) {
    const country = code === 'US' ? byCode.get(code) ?? UNITED_STATES_FALLBACK : byCode.get(code);
    if (!country) continue;
    out.push(country);
    used.add(code);
  }

  for (const country of countries) {
    const code = country.code.toUpperCase();
    if (used.has(code)) continue;
    if (country.count < MIN_DESTINATION_LISTINGS) continue;
    out.push(country);
    used.add(code);
  }

  return out.slice(0, MAX_DESTINATIONS);
}

function repeatUnitedStatesInMarquee(
  countries: HomeInternationalGrantsCountryRow[]
): HomeInternationalGrantsCountryRow[] {
  const unitedStates =
    countries.find((country) => country.code.toUpperCase() === 'US') ?? UNITED_STATES_FALLBACK;
  if (countries.length <= 4) return [unitedStates, ...countries];

  return [
    unitedStates,
    ...countries.slice(0, 4),
    unitedStates,
    ...countries.slice(4, 8),
    unitedStates,
    ...countries.slice(8)
  ];
}

/** Matches homepage orange accent (see `homeMarketingCtaClasses` premium / essay CTAs). */
const countryCardLinkClass =
  'group flex min-w-[172px] shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-300/90 hover:bg-gradient-to-b hover:from-white hover:to-orange-50/95 hover:shadow-[0_12px_32px_-12px_rgba(234,88,12,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 sm:min-w-[184px] sm:gap-3.5 sm:px-5 sm:py-3.5 lg:min-w-[220px] lg:px-6 lg:py-4';

function CountryCard({ row }: { row: HomeInternationalGrantsCountryRow }) {
  const href = `/get-scholarships?country=${encodeURIComponent(row.code)}`;
  const formattedCount = formatInteger(row.count);
  return (
    <Link
      href={href}
      className={countryCardLinkClass}
      aria-label={`${row.label}: ${formattedCount} scholarship listings — start matching`}
    >
      <img
        src={flagCdnUrl(row.code)}
        width={24}
        height={18}
        alt=""
        className="h-[18px] w-6 shrink-0 rounded-sm object-cover ring-1 ring-gray-200/90 transition group-hover:ring-orange-200/90"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold tracking-tight text-gray-900 transition group-hover:text-orange-950 sm:text-base">
          {row.label}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-gray-500 transition group-hover:text-orange-800/90 sm:text-sm lg:text-[0.9375rem]">
          {formattedCount} listings
        </p>
      </div>
    </Link>
  );
}

type HomeInternationalGrantsUspProps = {
  sectionPadX: string;
  sectionY: string;
  topApplicantCountries: HomeInternationalGrantsCountryRow[];
  catalogStats: HomeScholarshipCatalogStats | null;
};

export default function HomeInternationalGrantsUsp({
  sectionPadX,
  sectionY,
  topApplicantCountries,
  catalogStats
}: HomeInternationalGrantsUspProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const destinationCountries = useMemo(
    () => buildDestinationCountries(topApplicantCountries),
    [topApplicantCountries]
  );
  const hasCountries = destinationCountries.length > 0;
  const secondaryDestinationCountries = hasCountries
    ? [...destinationCountries.slice(3), ...destinationCountries.slice(0, 3)]
    : [];
  const primaryCountryLoop = hasCountries
    ? repeatUnitedStatesInMarquee(destinationCountries)
    : [];
  const secondaryCountryLoop = hasCountries
    ? repeatUnitedStatesInMarquee(secondaryDestinationCountries)
    : [];
  const primaryMarqueeItems = hasCountries ? [...primaryCountryLoop, ...primaryCountryLoop] : [];
  const secondaryMarqueeItems = hasCountries
    ? [...secondaryCountryLoop, ...secondaryCountryLoop]
    : [];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`border-b border-gray-100 bg-white ${sectionY} ${sectionPadX}`}
      aria-labelledby="international-grants-heading"
    >
      <div className={`${container} max-w-7xl`}>
        <div
          className={`grid grid-cols-1 gap-10 sm:gap-11 ${hasCountries ? 'lg:grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] lg:items-center lg:gap-12 xl:gap-16' : ''}`}
        >
          <div
            className={`text-center lg:text-left ${visible ? 'animate-pain-fade-up' : 'opacity-0'}`}
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-1.5 text-sm font-semibold text-emerald-800 lg:mx-0">
              <Globe2 className="h-4 w-4 text-emerald-600" aria-hidden />
              US &amp; International programs
            </div>
            <h2
              id="international-grants-heading"
              className="mt-5 text-pretty text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.06]"
            >
              Study grants in
              <span className="block text-emerald-500">the US &amp; beyond</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg sm:leading-relaxed lg:mx-0 lg:max-w-xl">
              Find funding in the world&apos;s leading colleges and universities. We&apos;ve
              combined the largest US grant database with international programs to support your
              talent anywhere on the globe.
            </p>
            <Link
              href="https://scholarshiptop.com/get-scholarships"
              className={`${emeraldCtaClass} mx-auto mt-8 lg:mx-0 lg:inline-flex`}
            >
              Match me with grants
              <ArrowRight className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
            </Link>
          </div>

          {hasCountries ? (
            <div
              className={`min-w-0 lg:rounded-[2rem] lg:border lg:border-slate-200/80 lg:bg-slate-50/70 lg:p-6 lg:shadow-[0_18px_60px_-40px_rgba(15,23,42,0.25)] xl:p-7 ${visible ? 'animate-works-mockup-in' : 'opacity-0'}`}
            >
              <div className="mb-4 flex flex-col items-center gap-2 lg:mb-5 lg:flex-row lg:justify-between">
                <p className="text-center text-sm font-medium text-slate-500 lg:text-left">
                  Top destinations in our catalog
                </p>
                <span className="hidden rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 lg:inline-flex">
                  {destinationCountries.length} destinations
                </span>
              </div>

              {catalogStats ? (
                <div className="mb-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-2 lg:text-left">
                  <div className="rounded-2xl border border-emerald-200/80 bg-white px-4 pt-3 pb-4 shadow-[0_8px_26px_-22px_rgba(16,185,129,0.35)]">
                    <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      {formatInteger(catalogStats.activeScholarshipCount)}+
                    </p>
                    <p className="mt-1 text-xs font-medium leading-snug text-emerald-800 sm:text-sm">
                      scholarships tracked live
                    </p>
                  </div>
                  {catalogStats.totalKnownAwardAmount > 0 ? (
                    <div className="rounded-2xl border border-orange-200/90 bg-white px-4 pt-3 pb-4 shadow-[0_8px_26px_-22px_rgba(234,88,12,0.25)]">
                      <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        {formatUsdCompact(catalogStats.totalKnownAwardAmount)}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-snug text-orange-800 sm:text-sm">
                        known listed award value
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className="relative"
                role="region"
                aria-label="Top countries by scholarship listing count"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white via-white/85 to-transparent sm:w-16 lg:from-slate-50 lg:via-slate-50/90"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white via-white/85 to-transparent sm:w-16 lg:from-slate-50 lg:via-slate-50/90"
                  aria-hidden
                />
                <div className="hidden snap-x gap-3 overflow-x-auto py-2 px-12 [scrollbar-width:none] motion-reduce:flex sm:gap-4 sm:px-16 [&::-webkit-scrollbar]:hidden">
                  {destinationCountries.map((row) => (
                    <div key={row.code} className="snap-start">
                      <CountryCard row={row} />
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto [scrollbar-width:none] motion-reduce:hidden lg:hidden [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max animate-home-country-marquee gap-3 py-2 pr-16 [animation-duration:80s] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] sm:gap-4 lg:py-3">
                    {primaryMarqueeItems.map((row, index) => (
                      <CountryCard key={`${row.code}-${index}`} row={row} />
                    ))}
                  </div>
                </div>
                <div className="hidden space-y-4 overflow-x-auto [scrollbar-width:none] motion-reduce:hidden lg:block [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max animate-home-country-marquee gap-4 py-2 pr-16 [animation-duration:95s] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
                    {primaryMarqueeItems.map((row, index) => (
                      <CountryCard key={`${row.code}-primary-${index}`} row={row} />
                    ))}
                  </div>
                  <div className="flex w-max animate-home-country-marquee gap-4 py-2 pr-16 [animation-direction:reverse] [animation-duration:115s] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
                    {secondaryMarqueeItems.map((row, index) => (
                      <CountryCard key={`${row.code}-secondary-${index}`} row={row} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
