import Link from 'next/link';

import type { HomePageCopy } from '@/lib/i18n/homePageCopy';

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

type HomeTrustStripProps = {
  sectionPadX: string;
  sectionY: string;
  copy: HomePageCopy['trustStrip'];
  hrefForPath: (path: string) => string | null;
};

export default function HomeTrustStrip({
  sectionPadX,
  sectionY,
  copy,
  hrefForPath
}: HomeTrustStripProps) {
  return (
    <section
      className={`border-b border-gray-100 bg-gray-50/90 ${sectionY} ${sectionPadX}`}
      aria-labelledby="home-trust-strip-heading"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2
          id="home-trust-strip-heading"
          className={`text-center text-pretty ${h2Class}`}
        >
          {copy.title}
        </h2>
        <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-3 sm:gap-7 lg:gap-8">
          {copy.cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200/90 bg-white p-7 shadow-[0_4px_24px_-16px_rgba(15,23,42,0.08)] sm:p-8"
            >
              <h3 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-[1.125rem]">
                {card.title}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-gray-600 sm:text-base sm:leading-relaxed">
                {card.body}
              </p>
              {hrefForPath(card.href) ? (
                <Link
                  href={hrefForPath(card.href)!}
                  className="mt-4 inline-flex text-sm font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2"
                >
                  {card.cta}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
