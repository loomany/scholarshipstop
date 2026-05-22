import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import type { LocalizedComparePageCopy } from '@/lib/i18n/comparePilot/compareDetailTranslationGate';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

type Props = {
  locale: Stage2PilotLocale;
  canonicalPath: string;
  copy: LocalizedComparePageCopy;
  hubLabel: string;
  hubPath: string;
};

export default function LocalizedCompareDetailPage({
  locale,
  canonicalPath,
  copy,
  hubLabel,
  hubPath
}: Props) {
  const hubHref = hrefForLocalizedUiRequired(locale, hubPath);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <LanguageSwitcher pathname={canonicalPath} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {copy.headline}
      </h1>

      {copy.intro ? (
        <p className="mt-4 text-lg leading-relaxed text-gray-700">{copy.intro}</p>
      ) : null}

      <div
        className="prose prose-indigo mt-8 max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: copy.bodyHtml }}
      />

      {copy.faq.length > 0 ? (
        <div className="mt-10">
          <SiteFaqAccordion items={copy.faq} />
        </div>
      ) : null}

      <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        {copy.disclaimer}
      </p>

      <div className="mt-10">
        <Link
          href={hubHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          {hubLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
